# Gemma Hackathon v0

A FastAPI backend for the Gemma Hackathon project with AI completion capabilities, caching, and a modular structure.

## Project Structure

```
v0/
├── backend/                 # FastAPI backend
│   ├── __init__.py
│   ├── main.py             # FastAPI application entry point
│   ├── config.py           # Configuration and settings
│   ├── cache.py            # LRU cache implementation
│   ├── instructions.py     # System instructions for AI
│   ├── api/                # API routes
│   │   ├── __init__.py
│   │   └── routes.py       # API route definitions
│   ├── utils/              # Utility modules
│   │   ├── __init__.py
│   │   └── generate_completions.py  # AI completion utilities
│   ├── test_api.py         # API testing script
│   └── README.md           # Backend documentation
├── main.py                 # Legacy main file
├── run_backend.py          # Backend startup script
├── test_backend.py         # Backend testing script
├── requirements.txt        # Python dependencies
├── pyproject.toml          # Project configuration
├── env.example             # Environment variables template
└── README.md               # This file
```

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Run the Backend

**Option A: Using startup script**
```bash
python run_backend.py
```

**Option B: Using Python module**
```bash
python -m backend.main
```

**Option C: Using uvicorn directly**
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## Features

- **FastAPI Framework**: Modern, fast web framework
- **AI Completions**: Integration with LLM models
- **Caching**: LRU cache for performance
- **CORS Support**: Cross-origin resource sharing
- **API Documentation**: Automatic OpenAPI/Swagger docs
- **Health Checks**: Built-in monitoring endpoints
- **Flexible Instructions**: Support for different AI instruction types

## API Endpoints

- `GET /` - Root endpoint with API info
- `GET /api/health` - Health check
- `POST /api/completions` - Generate AI completions
- `GET /api/instructions` - Get available instruction types
- `GET /api/cache/stats` - Cache statistics
- `DELETE /api/cache/clear` - Clear cache

## AI Instructions

The backend supports flexible AI instructions:

### Predefined Types
- **default** - Helpful assistant for understanding complex topics
- **exploration** - For exploring various topics
- **technical** - For technical explanations
- **creative** - For creative thinking

### Custom Instructions
You can also provide custom instructions in API requests.

## Configuration

Required environment variables:
- `BASE_URL`: LLM API base URL (e.g., Ollama: `http://localhost:11434/v1`)
- `API_KEY`: API key for LLM service
- `MODEL`: Model name (default: `gemma-2b-it`)

## Testing

Run the test script to verify the API setup:
```bash
python test_backend.py
```

## Development

### Import Structure
All imports use absolute paths with the `backend.` prefix:
```python
from backend.config import settings
from backend.api.routes import router
from backend.utils.generate_completions import get_completions
from backend.instructions import get_instruction
```

### Running Commands
- **Start server**: `python -m backend.main` or `uvicorn backend.main:app`
- **Run tests**: `python test_backend.py`
- **Development mode**: `uvicorn backend.main:app --reload`

For detailed backend documentation, see [backend/README.md](backend/README.md).
