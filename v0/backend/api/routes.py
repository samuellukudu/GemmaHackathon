from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from backend.cache import cache
from backend.utils.generate_completions import get_completions
from backend.config import settings
from backend.instructions import get_instruction, list_instruction_types

# Create router
router = APIRouter(prefix="/api", tags=["API"])

# Request/Response models
class CompletionRequest(BaseModel):
    prompt: str | list[Dict[str, str]]
    instructions: Optional[str] = None
    instruction_type: Optional[str] = "default"

class CompletionResponse(BaseModel):
    response: str
    success: bool

class InstructionsResponse(BaseModel):
    available_types: list[str]
    default_instruction: str

# AI completion endpoint
@router.post("/completions", response_model=CompletionResponse)
async def create_completion(request: CompletionRequest):
    """
    Generate AI completions using the configured LLM model.
    
    Args:
        request: CompletionRequest containing prompt and optional instructions/instruction_type
        
    Returns:
        CompletionResponse with the generated response
    """
    try:
        # Determine which instructions to use
        if request.instructions:
            # Use custom instructions if provided
            instructions = request.instructions
        else:
            # Use instruction type or default
            instructions = get_instruction(request.instruction_type)
        
        # Use cache to avoid redundant API calls
        cache_key = (str(request.prompt), instructions)
        
        response = await cache.get_or_set(
            cache_key,
            get_completions,
            request.prompt,
            instructions
        )
        
        return CompletionResponse(
            response=response,
            success=True
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating completion: {str(e)}"
        )

# Instructions endpoint
@router.get("/instructions", response_model=InstructionsResponse)
async def get_instructions():
    """
    Get available instruction types and the default instruction.
    """
    return InstructionsResponse(
        available_types=list_instruction_types(),
        default_instruction=get_instruction("default")
    )

# Cache management endpoints
@router.get("/cache/stats")
async def get_cache_stats():
    """
    Get cache statistics including size and configuration.
    """
    return {
        "cache_size": len(cache.cache),
        "max_size": cache.maxsize,
        "cache_hit_ratio": "N/A"  # Could be implemented with hit/miss counters
    }

@router.delete("/cache/clear")
async def clear_cache():
    """
    Clear the entire cache.
    """
    async with cache.lock:
        cache.cache.clear()
        cache.order.clear()
    return {"message": "Cache cleared successfully"}

# Health check endpoint
@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify API status.
    """
    return {
        "status": "healthy",
        "service": settings.API_TITLE,
        "version": settings.API_VERSION
    } 