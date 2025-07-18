from fastapi import APIRouter, HTTPException, BackgroundTasks, Body, Query
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
from backend.profiler import profile_endpoint
import logging
import uuid

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api", tags=["API"])

# Request/Response models
class BackgroundTaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

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
    query_id: Optional[str] = None

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

class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = None

class QueryResponse(BaseModel):
    success: bool
    message: str
    query_id: Optional[str] = None

class ContentResponse(BaseModel):
    query_id: str
    content: Any  # Can be Dict or List
    created_at: str
    processing_time: Optional[float] = None

class ContentListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total_count: int

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

# Query endpoint
@router.post("/query", response_model=QueryResponse)
@profile_endpoint("api.process_query")
async def process_query(request: QueryRequest):
    """
    Accepts a query and user_id, triggers both related questions and lessons generation as background tasks,
    and returns immediately with task IDs for status tracking.
    """
    try:
        query_id = str(uuid.uuid4())
        
        # Submit related questions generation as background task
        related_task_id = await task_queue.submit_task(
            "query_related_questions",
            {
                "query": request.query,
                "user_id": request.user_id,
                "query_id": query_id
            }
        )
        
        # Submit lessons generation as background task
        lessons_task_id = await task_queue.submit_task(
            "query_lessons",
            {
                "query": request.query,
                "user_id": request.user_id,
                "query_id": query_id
            }
        )
        
        return QueryResponse(
            success=True, 
            message="Related questions and lessons generation started in background.", 
            query_id=query_id
        )
    except Exception as e:
        logger.error(f"[QueryAPI] Error in process_query endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error processing query.")

# Content retrieval endpoints using query_id
@router.get("/lessons/{query_id}", response_model=ContentResponse)
async def get_lessons_by_query_id(query_id: str):
    """Get lessons by query_id"""
    try:
        lessons_data = await db.get_lessons_by_query_id(query_id)
        if not lessons_data:
            raise HTTPException(status_code=404, detail="Lessons not found")
        
        return ContentResponse(
            query_id=query_id,
            content=json.loads(lessons_data["lessons_json"]),
            created_at=lessons_data["created_at"],
            processing_time=lessons_data["processing_time"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving lessons: {str(e)}"
        )

@router.get("/related-questions/{query_id}", response_model=ContentResponse)
async def get_related_questions_by_query_id(query_id: str):
    """Get related questions by query_id"""
    try:
        questions_data = await db.get_related_questions_by_query_id(query_id)
        if not questions_data:
            raise HTTPException(status_code=404, detail="Related questions not found")
        
        return ContentResponse(
            query_id=query_id,
            content=json.loads(questions_data["questions_json"]),
            created_at=questions_data["created_at"],
            processing_time=questions_data["processing_time"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving related questions: {str(e)}"
        )

@router.get("/flashcards/{query_id}", response_model=ContentResponse)
async def get_flashcards_by_query_id(query_id: str):
    """Get flashcards by query_id"""
    try:
        flashcards_data = await db.get_flashcards_by_query_id(query_id)
        if not flashcards_data:
            raise HTTPException(status_code=404, detail="Flashcards not found")
        
        return ContentResponse(
            query_id=query_id,
            content=json.loads(flashcards_data["flashcards_json"]),
            created_at=flashcards_data["created_at"],
            processing_time=flashcards_data["processing_time"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving flashcards: {str(e)}"
        )

@router.get("/flashcards/{query_id}/{lesson_index}", response_model=ContentResponse)
async def get_flashcards_by_query_id_and_lesson_index(query_id: str, lesson_index: int):
    """Get flashcards for a specific lesson by query_id and lesson_index"""
    try:
        flashcards_data = await db.get_flashcards_by_query_id_and_lesson_index(query_id, lesson_index)
        if not flashcards_data:
            raise HTTPException(status_code=404, detail=f"Flashcards not found for lesson {lesson_index}")
        
        return ContentResponse(
            query_id=query_id,
            content=json.loads(flashcards_data["flashcards_json"]),
            created_at=flashcards_data["created_at"],
            processing_time=flashcards_data["processing_time"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving flashcards: {str(e)}"
        )

# Recent content endpoints
@router.get("/lessons", response_model=ContentListResponse)
async def get_recent_lessons(limit: int = 50):
    """Get recent lessons history"""
    try:
        history = await db.get_recent_lessons(limit=limit)
        return ContentListResponse(
            items=history,
            total_count=len(history)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving lessons history: {str(e)}"
        )

@router.get("/related-questions", response_model=ContentListResponse)
async def get_recent_related_questions(limit: int = 50):
    """Get recent related questions history"""
    try:
        history = await db.get_recent_related_questions(limit=limit)
        return ContentListResponse(
            items=history,
            total_count=len(history)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving related questions history: {str(e)}"
        )

@router.get("/flashcards", response_model=ContentListResponse)
async def get_recent_flashcards(limit: int = 50):
    """Get recent flashcards history"""
    try:
        history = await db.get_recent_flashcards(limit=limit)
        return ContentListResponse(
            items=history,
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

# Performance monitoring endpoint
@router.get("/performance/metrics")
async def get_performance_metrics():
    """Get comprehensive performance metrics including profiling data"""
    try:
        metrics = task_queue.get_performance_metrics()
        return {
            "status": "success",
            "metrics": metrics,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": time.time()
        }

 