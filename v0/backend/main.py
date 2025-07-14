from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import asyncio

# Import configuration and routes
from backend.config import settings, validate_environment
from backend.api.routes import router
from backend.database import db
from backend.task_queue import task_queue

# Validate environment variables
try:
    validate_environment()
except ValueError as e:
    print(f"Configuration error: {e}")
    print("Please set the required environment variables: BASE_URL, API_KEY")
    exit(1)

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    debug=settings.DEBUG
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)

@app.on_event("startup")
async def startup_event():
    """Initialize database and task queue on startup"""
    print("Initializing database...")
    await db.init()
    print("Database initialized successfully")
    
    print("Starting task queue...")
    await task_queue.start()
    print("Task queue started successfully")
    
    print(f"Starting {settings.API_TITLE} on {settings.HOST}:{settings.PORT}")
    print(f"Debug mode: {settings.DEBUG}")
    print(f"API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"Health check: http://{settings.HOST}:{settings.PORT}/api/health")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    print("Stopping task queue...")
    await task_queue.stop()
    print("Task queue stopped successfully")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": f"{settings.API_TITLE} is running!",
        "version": settings.API_VERSION,
        "docs": "/docs",
        "health": "/api/health",
        "features": [
            "Background task processing",
            "Database persistence",
            "Hybrid caching (memory + database)",
            "Request history tracking",
            "Batch processing support"
        ]
    }

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
