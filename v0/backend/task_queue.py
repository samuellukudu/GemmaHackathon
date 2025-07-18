import asyncio
import uuid
import time
from typing import Dict, Any, Optional, Callable, Coroutine
from datetime import datetime
import json
from backend.database import db
from backend.utils.generate_completions import get_completions
from backend.profiler import profiler, profile_task
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
                    if task_type == 'query_related_questions':
                        result = await self._process_query_related_questions_task(payload)
                    elif task_type == 'query_lessons':
                        result = await self._process_query_lessons_task(payload)
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
    

    
    async def _cleanup_old_tasks(self):
        """Clean up old completed tasks from memory and log performance metrics"""
        cleanup_count = 0
        
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
                
                # Log performance metrics every 10 cleanup cycles (50 minutes)
                cleanup_count += 1
                if cleanup_count % 10 == 0:
                    print(f"[TaskQueue] Periodic performance check (cleanup #{cleanup_count})")
                    self.log_performance_summary()
                
                await asyncio.sleep(300)  # Clean up every 5 minutes
                
            except Exception as e:
                print(f"[TaskQueue] Cleanup error: {e}")
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
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics including profiling data"""
        queue_stats = self.get_queue_stats()
        profiling_report = profiler.get_performance_report()
        
        return {
            'queue_stats': queue_stats,
            'profiling_report': profiling_report,
            'timestamp': time.time()
        }
    
    def log_performance_summary(self):
        """Log performance summary including blocking code detection"""
        profiler.log_performance_summary()
        
        # Log queue-specific metrics
        stats = self.get_queue_stats()
        print(f"[TaskQueue] Queue size: {stats['queue_size']}, Active tasks: {stats['active_tasks']}, Workers: {stats['workers']}")
        
        # Warn about queue backlog
        if stats['queue_size'] > 10:
            print(f"[TaskQueue] WARNING: Large queue backlog detected ({stats['queue_size']} tasks)")
        
        if stats['active_tasks'] > stats['workers'] * 2:
            print(f"[TaskQueue] WARNING: High task load detected ({stats['active_tasks']} active tasks for {stats['workers']} workers)")
    
    @profile_task("task_queue.process_query_related_questions")
    async def _process_query_related_questions_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process query related questions generation task"""
        from backend.instructions import get_instruction
        from backend.cache import cache
        from backend.monitoring import performance_monitor
        import json
        
        start_time = time.time()
        query = payload['query']
        user_id = payload.get('user_id')
        query_id = payload.get('query_id')
        
        try:
            instructions = get_instruction("related_questions")
            cache_key = (f"related_questions:{query}", instructions)
            
            # Check cache first
            try:
                cached_response = await cache.get_cache(cache_key)
                if cached_response:
                    response_data = cached_response
                    performance_monitor.record_cache_hit()
                else:
                    response_data = await get_completions(query, instructions)
                    performance_monitor.record_cache_miss()
                    # Store in cache (non-blocking)
                    import asyncio
                    asyncio.create_task(cache.set_cache(cache_key, response_data))
            except Exception:
                response_data = await get_completions(query, instructions)
                performance_monitor.record_cache_miss()
            
            # Parse response
            try:
                parsed_response = json.loads(response_data)
                related_questions = parsed_response.get("related_questions", [])
            except json.JSONDecodeError:
                related_questions = []
            
            processing_time = time.time() - start_time
            
            # Save to database
            await db.save_request_history(
                prompt=f"related_questions:{query}",
                response=response_data,
                instructions=instructions,
                processing_time=processing_time,
                user_id=user_id
            )
            await db.save_related_questions_history(
                query_id=query_id,
                questions_json=json.dumps(related_questions),
                processing_time=processing_time
            )
            
            return {
                'related_questions': related_questions,
                'processing_time': processing_time,
                'success': True
            }
        except Exception as e:
            processing_time = time.time() - start_time
            return {
                'error': str(e),
                'processing_time': processing_time,
                'success': False
            }
    
    @profile_task("task_queue.process_query_lessons")
    async def _process_query_lessons_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Process query lessons generation task"""
        from backend.instructions import get_instruction
        from backend.cache import cache
        from backend.monitoring import performance_monitor
        import json
        import asyncio
        
        start_time = time.time()
        query = payload['query']
        user_id = payload.get('user_id')
        query_id = payload.get('query_id')
        
        try:
            instructions = get_instruction("lessons")
            cache_key = (f"lessons:{query}", instructions)
            
            # Check cache first
            try:
                cached_response = await cache.get_cache(cache_key)
                if cached_response:
                    response_data = cached_response
                    performance_monitor.record_cache_hit()
                else:
                    response_data = await get_completions(query, instructions)
                    performance_monitor.record_cache_miss()
                    # Store in cache (non-blocking)
                    asyncio.create_task(cache.set_cache(cache_key, response_data))
            except Exception:
                response_data = await get_completions(query, instructions)
                performance_monitor.record_cache_miss()
            
            # Parse response
            try:
                parsed_response = json.loads(response_data)
                lessons = parsed_response.get("lessons", [])
            except json.JSONDecodeError:
                lessons = []
            
            processing_time = time.time() - start_time
            
            # Save to database
            await db.save_request_history(
                prompt=f"lessons:{query}",
                response=response_data,
                instructions=instructions,
                processing_time=processing_time,
                user_id=user_id
            )
            await db.save_lessons_history(
                query_id=query_id,
                lessons_json=json.dumps(lessons),
                processing_time=processing_time
            )
            
            # Schedule flashcard generation in background (non-blocking)
            if lessons:
                async def generate_flashcards_for_lesson(lesson, lesson_index):
                    try:
                        start_time_fc = time.time()
                        flashcard_instructions = get_instruction("flashcards")
                        
                        # Use lesson content for flashcard generation
                        lesson_content_for_prompt = {
                            "title": lesson.get("title"),
                            "overview": lesson.get("overview"),
                            "key_concepts": lesson.get("key_concepts")
                        }
                        lesson_prompt = json.dumps(lesson_content_for_prompt)
                        
                        flashcard_response = await get_completions(lesson_prompt, flashcard_instructions)
                        flashcard_parsed = json.loads(flashcard_response)
                        flashcards = flashcard_parsed.get("flashcards", [])
                        
                        processing_time_fc = time.time() - start_time_fc
                        
                        await db.save_flashcards_history(
                            query_id=query_id,
                            lesson_index=lesson_index,
                            lesson_json=json.dumps(lesson), # Save the full lesson
                            flashcards_json=json.dumps(flashcards),
                            processing_time=processing_time_fc
                        )
                    except Exception as e:
                        print(f"Error generating flashcards for lesson {lesson_index}: {e}")
                
                flashcard_tasks = [generate_flashcards_for_lesson(lesson, index) for index, lesson in enumerate(lessons)]
                await asyncio.gather(*flashcard_tasks, return_exceptions=True)
            
            return {
                'lessons': lessons,
                'processing_time': processing_time,
                'success': True
            }
        except Exception as e:
            processing_time = time.time() - start_time
            return {
                'error': str(e),
                'processing_time': processing_time,
                'success': False
            }

# Global task queue instance
# Check if worker count is manually set via environment variable
manual_workers = os.getenv("TASK_QUEUE_WORKERS")
if manual_workers:
    worker_count = int(manual_workers)
    print(f"[TaskQueue] Using manually configured worker count: {worker_count}")
else:
    # Auto-calculate based on CPU cores
    cpu_cores = os.cpu_count() or 2
    if cpu_cores > 4:
        worker_count = cpu_cores // 2
        print(f"[TaskQueue] Detected {cpu_cores} CPU cores, using {worker_count} workers (half of available cores)")
    else:
        worker_count = min(cpu_cores, 4)
        print(f"[TaskQueue] Detected {cpu_cores} CPU cores, using {worker_count} workers (limited to available cores, max 4)")

task_queue = TaskQueue(max_workers=worker_count)