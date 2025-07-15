from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import time
import asyncio
import json
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

class LessonsRequest(BaseModel):
    query: str
    user_id: Optional[str] = None

class LessonsResponse(BaseModel):
    lessons: List[Dict[str, Any]]
    success: bool
    processing_time: Optional[float] = None

class RelatedQuestionsRequest(BaseModel):
    query: str
    user_id: Optional[str] = None

class RelatedQuestionsResponse(BaseModel):
    related_questions: List[Dict[str, Any]]
    success: bool
    processing_time: Optional[float] = None

class FlashcardsRequest(BaseModel):
    lesson: Dict[str, Any]
    user_id: Optional[str] = None

class Flashcard(BaseModel):
    question: str
    answer: str

class FlashcardsResponse(BaseModel):
    flashcards: List[Flashcard]
    success: bool
    processing_time: Optional[float] = None

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
        start_time = time.perf_counter()
        
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
                # Store in cache (don't await to avoid blocking)
                asyncio.create_task(cache.set_cache(cache_key, response))
        except Exception:
            # Fallback to direct call
            response = await get_completions(request.prompt, instructions)
            performance_monitor.record_cache_miss()
        
        processing_time = time.perf_counter() - start_time
        
        # Save to history in background (non-blocking)
        asyncio.create_task(db.save_request_history(
            prompt=str(request.prompt),
            response=response,
            instructions=instructions,
            processing_time=processing_time,
            user_id=request.user_id
        ))
        
        # Record performance metrics (non-blocking)
        asyncio.create_task(asyncio.to_thread(
            performance_monitor.record_request, "/api/completions", processing_time, True
        ))
        
        return CompletionResponse(
            response=response,
            success=True,
            processing_time=processing_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        # Record error in background (non-blocking)
        asyncio.create_task(asyncio.to_thread(
            performance_monitor.record_request, "/api/completions", 0, False
        ))
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

# Generate lessons endpoint
@router.post("/lessons", response_model=LessonsResponse)
async def generate_lessons(request: LessonsRequest):
    """
    Generate 5 structured lessons/guides to help understand and answer a query.
    """
    try:
        start_time = time.perf_counter()
        
        # Get lessons instruction
        instructions = get_instruction("lessons")
        
        # Use cache to avoid redundant API calls
        cache_key = (f"lessons:{request.query}", instructions)
        
        # Check if we have a cache hit
        try:
            cached_response = await cache.get_cache(cache_key)
            if cached_response:
                response_data = cached_response
                performance_monitor.record_cache_hit()
            else:
                response_data = await get_completions(request.query, instructions)
                performance_monitor.record_cache_miss()
                # Store in cache (non-blocking)
                asyncio.create_task(cache.set_cache(cache_key, response_data))
        except Exception:
            # Fallback to direct call
            response_data = await get_completions(request.query, instructions)
            performance_monitor.record_cache_miss()
        
        processing_time = time.perf_counter() - start_time
        
        # Parse JSON response
        try:
            parsed_response = json.loads(response_data)
            lessons = parsed_response.get("lessons", [])
        except json.JSONDecodeError:
            # If JSON parsing fails, return error
            raise HTTPException(
                status_code=500,
                detail="Failed to parse lessons response"
            )
        
        # Save to history in background (non-blocking)
        asyncio.create_task(db.save_request_history(
            prompt=f"lessons:{request.query}",
            response=response_data,
            instructions=instructions,
            processing_time=processing_time,
            user_id=request.user_id
        ))
        # Save generated lessons to lessons_history table
        asyncio.create_task(db.save_lessons_history(
            user_id=request.user_id,
            query=request.query,
            lessons_json=json.dumps(lessons),
            processing_time=processing_time
        ))
        # Background flashcard generation for each lesson
        async def generate_and_save_flashcards(lesson, user_id, processing_time):
            try:
                instructions = get_instruction("flashcards")
                lesson_prompt = json.dumps(lesson)
                response_data = await get_completions(lesson_prompt, instructions)
                parsed_response = json.loads(response_data)
                flashcards = parsed_response.get("flashcards", [])
                await db.save_flashcards_history(
                    user_id=user_id,
                    lesson_json=lesson_prompt,
                    flashcards_json=json.dumps(flashcards),
                    processing_time=processing_time
                )
            except Exception as e:
                # Optionally log error
                pass
        for lesson in lessons:
            asyncio.create_task(generate_and_save_flashcards(lesson, request.user_id, processing_time))
        
        # Record performance metrics (non-blocking)
        asyncio.create_task(asyncio.to_thread(
            performance_monitor.record_request, "/api/lessons", processing_time, True
        ))
        
        return LessonsResponse(
            lessons=lessons,
            success=True,
            processing_time=processing_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        # Record error in background (non-blocking)
        asyncio.create_task(asyncio.to_thread(
            performance_monitor.record_request, "/api/lessons", 0, False
        ))
        raise HTTPException(
            status_code=500,
            detail=f"Error generating lessons: {str(e)}"
        )

# Generate related questions endpoint
@router.post("/related-questions", response_model=RelatedQuestionsResponse)
async def generate_related_questions(request: RelatedQuestionsRequest):
    """
    Generate 5 related questions to help explore different aspects of a topic.
    """
    try:
        start_time = time.perf_counter()
        
        # Get related questions instruction
        instructions = get_instruction("related_questions")
        
        # Use cache to avoid redundant API calls
        cache_key = (f"related_questions:{request.query}", instructions)
        
        # Check if we have a cache hit
        try:
            cached_response = await cache.get_cache(cache_key)
            if cached_response:
                response_data = cached_response
                performance_monitor.record_cache_hit()
            else:
                response_data = await get_completions(request.query, instructions)
                performance_monitor.record_cache_miss()
                # Store in cache (non-blocking)
                asyncio.create_task(cache.set_cache(cache_key, response_data))
        except Exception:
            # Fallback to direct call
            response_data = await get_completions(request.query, instructions)
            performance_monitor.record_cache_miss()
        
        processing_time = time.perf_counter() - start_time
        
        # Parse JSON response
        try:
            parsed_response = json.loads(response_data)
            related_questions = parsed_response.get("related_questions", [])
        except json.JSONDecodeError:
            # If JSON parsing fails, return error
            raise HTTPException(
                status_code=500,
                detail="Failed to parse related questions response"
            )
        
        # Save to history in background (non-blocking)
        asyncio.create_task(db.save_request_history(
            prompt=f"related_questions:{request.query}",
            response=response_data,
            instructions=instructions,
            processing_time=processing_time,
            user_id=request.user_id
        ))
        # Save generated related questions to related_questions_history table
        asyncio.create_task(db.save_related_questions_history(
            user_id=request.user_id,
            query=request.query,
            questions_json=json.dumps(related_questions),
            processing_time=processing_time
        ))
        
        # Record performance metrics (non-blocking)
        asyncio.create_task(asyncio.to_thread(
            performance_monitor.record_request, "/api/related-questions", processing_time, True
        ))
        
        return RelatedQuestionsResponse(
            related_questions=related_questions,
            success=True,
            processing_time=processing_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        # Record error in background (non-blocking)
        asyncio.create_task(asyncio.to_thread(
            performance_monitor.record_request, "/api/related-questions", 0, False
        ))
        raise HTTPException(
            status_code=500,
            detail=f"Error generating related questions: {str(e)}"
        )

# Generate flashcards endpoint
@router.post("/flashcards", response_model=FlashcardsResponse)
async def generate_flashcards(request: FlashcardsRequest):
    """
    Generate flashcards (Q&A pairs) from a lesson object.
    """
    try:
        start_time = time.perf_counter()
        instructions = get_instruction("flashcards")
        # Use the lesson as the prompt (stringify for LLM)
        lesson_prompt = json.dumps(request.lesson)
        cache_key = (f"flashcards:{lesson_prompt}", instructions)
        try:
            cached_response = await cache.get_cache(cache_key)
            if cached_response:
                response_data = cached_response
                performance_monitor.record_cache_hit()
            else:
                response_data = await get_completions(lesson_prompt, instructions)
                performance_monitor.record_cache_miss()
                asyncio.create_task(cache.set_cache(cache_key, response_data))
        except Exception:
            response_data = await get_completions(lesson_prompt, instructions)
            performance_monitor.record_cache_miss()
        processing_time = time.perf_counter() - start_time
        # Parse JSON response
        try:
            parsed_response = json.loads(response_data)
            flashcards = parsed_response.get("flashcards", [])
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse flashcards response"
            )
        # (Optional) Save to DB here if desired
        asyncio.create_task(db.save_flashcards_history(
            user_id=request.user_id,
            lesson_json=json.dumps(request.lesson),
            flashcards_json=json.dumps(flashcards),
            processing_time=processing_time
        ))
        # Record performance metrics (non-blocking)
        asyncio.create_task(asyncio.to_thread(
            performance_monitor.record_request, "/api/flashcards", processing_time, True
        ))
        return FlashcardsResponse(
            flashcards=[Flashcard(**fc) for fc in flashcards],
            success=True,
            processing_time=processing_time
        )
    except HTTPException:
        raise
    except Exception as e:
        asyncio.create_task(asyncio.to_thread(
            performance_monitor.record_request, "/api/flashcards", 0, False
        ))
        raise HTTPException(
            status_code=500,
            detail=f"Error generating flashcards: {str(e)}"
        )

# Flashcards history retrieval endpoint
class FlashcardsHistoryResponse(BaseModel):
    history: List[Dict[str, Any]]
    total_count: int

class LessonsHistoryResponse(BaseModel):
    history: List[Dict[str, Any]]
    total_count: int

@router.get("/lessons/history", response_model=LessonsHistoryResponse)
async def get_lessons_history(limit: int = 50, user_id: Optional[str] = None, query: Optional[str] = None):
    """Get recent lessons generation history"""
    try:
        history = await db.get_lessons_history(limit=limit, user_id=user_id, query=query)
        return LessonsHistoryResponse(
            history=history,
            total_count=len(history)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving lessons history: {str(e)}"
        )

# Update flashcards history retrieval endpoint to allow filtering by lesson_json or lesson_id
@router.get("/flashcards/history", response_model=FlashcardsHistoryResponse)
async def get_flashcards_history(limit: int = 50, user_id: Optional[str] = None, lesson_json: Optional[str] = None, lesson_id: Optional[int] = None):
    """Get recent flashcards generation history (optionally filter by lesson)"""
    try:
        history = await db.get_flashcards_history(limit=limit, user_id=user_id)
        # Filter in-memory if lesson_json or lesson_id is provided
        if lesson_json:
            history = [h for h in history if h.get("lesson_json") == lesson_json]
        if lesson_id:
            history = [h for h in history if h.get("id") == lesson_id]
        return FlashcardsHistoryResponse(
            history=history,
            total_count=len(history)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving flashcards history: {str(e)}"
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

 