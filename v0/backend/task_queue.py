import asyncio
import uuid
import time
from typing import Dict, Any, Optional, Callable, Coroutine
from datetime import datetime
import json
from backend.database import db
from backend.utils.generate_completions import get_completions
import os

class TaskQueue:
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self.task_results: Dict[str, Any] = {}
        self._queue = asyncio.Queue()
        self._workers = []
        self._running = False
    
    async def start(self):
        """Start the task queue workers"""
        if self._running:
            return
        
        self._running = True
        # Start worker tasks
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self._workers.append(worker)
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_old_tasks())
    
    async def stop(self):
        """Stop the task queue workers"""
        self._running = False
        
        # Cancel all workers
        for worker in self._workers:
            worker.cancel()
        
        # Wait for workers to finish
        if self._workers:
            await asyncio.gather(*self._workers, return_exceptions=True)
        
        # Cancel active tasks
        for task in self.active_tasks.values():
            task.cancel()
        
        self._workers.clear()
        self.active_tasks.clear()
    
    async def _worker(self, worker_name: str):
        """Worker coroutine that processes tasks from the queue"""
        while self._running:
            try:
                # Get task from queue with timeout
                task_data = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                
                task_id = task_data['task_id']
                task_type = task_data['task_type']
                payload = task_data['payload']
                
                # Update task status to processing
                await db.update_task_status(task_id, 'processing')
                
                # Process the task
                try:
                    if task_type == 'completion':
                        result = await self._process_completion_task(payload)
                    elif task_type == 'batch_completion':
                        result = await self._process_batch_completion_task(payload)
                    else:
                        raise ValueError(f"Unknown task type: {task_type}")
                    
                    # Store result
                    self.task_results[task_id] = result
                    await db.update_task_status(task_id, 'completed', json.dumps(result))
                    
                except Exception as e:
                    error_msg = str(e)
                    await db.update_task_status(task_id, 'failed', error_message=error_msg)
                    self.task_results[task_id] = {'error': error_msg}
                
                finally:
                    self._queue.task_done()
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Worker {worker_name} error: {e}")
                continue
    
    async def _process_completion_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single completion task"""
        start_time = time.time()
        
        prompt = payload['prompt']
        instructions = payload.get('instructions')
        
        # Generate completion
        response = await get_completions(prompt, instructions)
        
        processing_time = time.time() - start_time
        
        # Save to history
        await db.save_request_history(
            prompt=str(prompt),
            response=response,
            instructions=instructions,
            processing_time=processing_time,
            user_id=payload.get('user_id')
        )
        
        return {
            'response': response,
            'processing_time': processing_time,
            'success': True
        }
    
    async def _process_batch_completion_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process a batch of completion tasks"""
        start_time = time.time()
        prompts = payload['prompts']
        instructions = payload.get('instructions')
        results = []
        
        for prompt in prompts:
            try:
                response = await get_completions(prompt, instructions)
                results.append({
                    'prompt': prompt,
                    'response': response,
                    'success': True
                })
            except Exception as e:
                results.append({
                    'prompt': prompt,
                    'error': str(e),
                    'success': False
                })
        
        processing_time = time.time() - start_time
        
        return {
            'results': results,
            'total_processing_time': processing_time,
            'success_count': sum(1 for r in results if r['success']),
            'error_count': sum(1 for r in results if not r['success'])
        }
    
    async def _cleanup_old_tasks(self):
        """Clean up old completed tasks from memory"""
        while self._running:
            try:
                # Remove tasks older than 1 hour from memory
                cutoff_time = time.time() - 3600
                tasks_to_remove = []
                
                for task_id, task in self.active_tasks.items():
                    if task.done():
                        tasks_to_remove.append(task_id)
                
                for task_id in tasks_to_remove:
                    del self.active_tasks[task_id]
                    if task_id in self.task_results:
                        del self.task_results[task_id]
                
                await asyncio.sleep(300)  # Clean up every 5 minutes
                
            except Exception as e:
                print(f"Cleanup error: {e}")
                await asyncio.sleep(60)
    
    async def submit_task(self, task_type: str, payload: Dict[str, Any]) -> str:
        """Submit a new task to the queue"""
        task_id = str(uuid.uuid4())
        
        # Create task record in database
        await db.create_background_task(task_id, task_type, payload)
        
        # Add to queue
        await self._queue.put({
            'task_id': task_id,
            'task_type': task_type,
            'payload': payload
        })
        
        return task_id
    
    async def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the result of a completed task"""
        # Check in-memory results first
        if task_id in self.task_results:
            return self.task_results[task_id]
        
        # Check database
        task_info = await db.get_task_status(task_id)
        if task_info and task_info['status'] == 'completed':
            return json.loads(task_info['result']) if task_info['result'] else None
        
        return None
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a task"""
        # Check if task is still active
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            if task.done():
                return {'status': 'completed' if not task.exception() else 'failed'}
            else:
                return {'status': 'processing'}
        
        # Check database
        return await db.get_task_status(task_id)
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        return {
            'queue_size': self._queue.qsize(),
            'active_tasks': len(self.active_tasks),
            'workers': len(self._workers),
            'running': self._running
        }

# Global task queue instance
cpu_cores = os.cpu_count() or 2
if cpu_cores > 2:
    worker_count = cpu_cores // 2
else:
    worker_count = 2
task_queue = TaskQueue(max_workers=worker_count) 