from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import time
from backend.cache import cache
from backend.utils.generate_completions import get_completions
from backend.config import settings
from backend.instructions import get_instruction, list_instruction_types
from backend.task_queue import task_queue
from backend.database import db
from backend.monitoring import performance_monitor

# Create router
router = APIRouter(prefix="/api", tags=["API"])

# Request/Response models
class CompletionRequest(BaseModel):
    prompt: str | list[Dict[str, str]]
    instructions: Optional[str] = None
    instruction_type: Optional[str] = "default"
    background: Optional[bool] = False
    user_id: Optional[str] = None

class CompletionResponse(BaseModel):
    response: str
    success: bool
    processing_time: Optional[float] = None

class BackgroundTaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

class BatchCompletionRequest(BaseModel):
    prompts: List[str]
    instructions: Optional[str] = None
    instruction_type: Optional[str] = "default"
    user_id: Optional[str] = None

class InstructionsResponse(BaseModel):
    available_types: list[str]
    default_instruction: str

class HistoryResponse(BaseModel):
    requests: List[Dict[str, Any]]
    total_count: int

# AI completion endpoint with background processing option
@router.post("/completions", response_model=CompletionResponse)
async def create_completion(request: CompletionRequest):
    """
    Generate AI completions using the configured LLM model.
    Supports both synchronous and background processing.
    """
    try:
        # Determine which instructions to use
        if request.instructions:
            instructions = request.instructions
        else:
            instructions = get_instruction(request.instruction_type)
        
        # If background processing is requested
        if request.background:
            task_id = await task_queue.submit_task(
                "completion",
                {
                    "prompt": request.prompt,
                    "instructions": instructions,
                    "user_id": request.user_id
                }
            )
            raise HTTPException(
                status_code=202,
                detail={
                    "message": "Task submitted for background processing",
                    "task_id": task_id,
                    "status_endpoint": f"/api/tasks/{task_id}"
                }
            )
        
        # Synchronous processing
        start_time = time.time()
        
        # Use cache to avoid redundant API calls
        cache_key = (str(request.prompt), instructions)
        
        # Check if we have a cache hit
        cache_hit = False
        try:
            # Try to get from cache first
            cached_response = await cache.get_cache(cache_key)
            if cached_response:
                response = cached_response
                cache_hit = True
                performance_monitor.record_cache_hit()
            else:
                response = await get_completions(request.prompt, instructions)
                performance_monitor.record_cache_miss()
                # Store in cache
                await cache.set_cache(cache_key, response)
        except Exception:
            # Fallback to direct call
            response = await get_completions(request.prompt, instructions)
            performance_monitor.record_cache_miss()
        
        processing_time = time.time() - start_time
        
        # Save to history in background
        asyncio.create_task(db.save_request_history(
            prompt=str(request.prompt),
            response=response,
            instructions=instructions,
            processing_time=processing_time,
            user_id=request.user_id
        ))
        
        # Record performance metrics
        performance_monitor.record_request("/api/completions", processing_time, success=True)
        
        return CompletionResponse(
            response=response,
            success=True,
            processing_time=processing_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        performance_monitor.record_request("/api/completions", 0, success=False)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating completion: {str(e)}"
        )

# Background task status endpoint
@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of a background task"""
    task_info = await task_queue.get_task_status(task_id)
    if not task_info:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "task_id": task_id,
        "status": task_info.get("status", "unknown"),
        "result": task_info.get("result"),
        "error_message": task_info.get("error_message"),
        "created_at": task_info.get("created_at"),
        "completed_at": task_info.get("completed_at")
    }

# Batch completion endpoint
@router.post("/completions/batch", response_model=BackgroundTaskResponse)
async def create_batch_completion(request: BatchCompletionRequest):
    """Submit a batch of completion requests for background processing"""
    try:
        instructions = request.instructions or get_instruction(request.instruction_type)
        
        task_id = await task_queue.submit_task(
            "batch_completion",
            {
                "prompts": request.prompts,
                "instructions": instructions,
                "user_id": request.user_id
            }
        )
        
        return BackgroundTaskResponse(
            task_id=task_id,
            status="pending",
            message="Batch processing started"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error submitting batch task: {str(e)}"
        )

# Request history endpoint
@router.get("/history", response_model=HistoryResponse)
async def get_request_history(limit: int = 50, user_id: Optional[str] = None):
    """Get recent request history"""
    try:
        history = await db.get_request_history(limit=limit, user_id=user_id)
        return HistoryResponse(
            requests=history,
            total_count=len(history)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving history: {str(e)}"
        )

# Instructions endpoint
@router.get("/instructions", response_model=InstructionsResponse)
async def get_instructions():
    """Get available instruction types and the default instruction."""
    return InstructionsResponse(
        available_types=list_instruction_types(),
        default_instruction=get_instruction("default")
    )

# Performance monitoring endpoint
@router.get("/performance")
async def get_performance_stats():
    """Get comprehensive performance statistics"""
    return performance_monitor.get_stats()

# Enhanced cache management endpoints
@router.get("/cache/stats")
async def get_cache_stats():
    """Get comprehensive cache statistics"""
    memory_stats = cache.get_stats()
    
    # Get database cache stats
    try:
        db_stats = await db.get_cache_stats()
    except:
        db_stats = {"error": "Database cache stats unavailable"}
    
    return {
        "memory_cache": memory_stats,
        "database_cache": db_stats,
        "task_queue": task_queue.get_queue_stats(),
        "performance": performance_monitor.get_stats()
    }

@router.delete("/cache/clear")
async def clear_cache():
    """Clear both memory and database cache"""
    await cache.clear()
    return {"message": "Cache cleared successfully"}

@router.post("/cache/cleanup")
async def cleanup_cache():
    """Clean up expired cache entries"""
    await cache.cleanup_expired()
    await db.cleanup_expired_cache()
    return {"message": "Cache cleanup completed"}

# Health check endpoint with enhanced status
@router.get("/health")
async def health_check():
    """Enhanced health check endpoint"""
    try:
        # Check database connectivity
        await db.get_cache("health_check")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy",
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "database": db_status,
        "task_queue": task_queue.get_queue_stats(),
        "cache": cache.get_stats()
    }

# Import asyncio for background tasks
import asyncio 