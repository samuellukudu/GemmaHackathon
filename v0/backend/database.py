import aiosqlite
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json
from pathlib import Path
import os

class Database:
    def __init__(self, db_path: str = "llm_app.db"):
        self.db_path = db_path
        self._lock = asyncio.Lock()
    
    async def init(self):
        """Initialize database tables and ensure schema is up to date"""
        db_exists = os.path.exists(self.db_path)
        async with aiosqlite.connect(self.db_path) as db:
            # Enable WAL mode for better concurrency
            await db.execute("PRAGMA journal_mode=WAL;")
            # Cache table for persistent caching
            await db.execute("""
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    access_count INTEGER DEFAULT 1
                )
            """)
            
            # Request history table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS request_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt TEXT NOT NULL,
                    response TEXT NOT NULL,
                    instructions TEXT,
                    processing_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id TEXT
                )
            """)
            
            # User sessions table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    user_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            """)
            
            # Background tasks table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS background_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT UNIQUE NOT NULL,
                    task_type TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    payload TEXT,
                    result TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    error_message TEXT
                )
            """)
            
            # Lessons history table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS lessons_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    query TEXT NOT NULL,
                    lessons_json TEXT NOT NULL,
                    processing_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    query_id TEXT
                )
            """)
            
            # Related questions history table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS related_questions_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    query TEXT NOT NULL,
                    questions_json TEXT NOT NULL,
                    processing_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    query_id TEXT
                )
            """)
            
            # Flashcards history table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS flashcards_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    lesson_json TEXT NOT NULL,
                    flashcards_json TEXT NOT NULL,
                    processing_time REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    query_id TEXT
                )
            """)
            
            # Create indexes for better performance
            await db.execute("CREATE INDEX IF NOT EXISTS idx_cache_accessed_at ON cache(accessed_at)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_request_history_created_at ON request_history(created_at)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_request_history_user_id ON request_history(user_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_background_tasks_status ON background_tasks(status)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_lessons_history_user_id_created_at ON lessons_history(user_id, created_at)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_related_questions_history_user_id_created_at ON related_questions_history(user_id, created_at)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_flashcards_history_user_id_created_at ON flashcards_history(user_id, created_at)")
            
            await db.commit()
    
    async def get_cache(self, key: str) -> Optional[str]:
        """Get value from persistent cache"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT value FROM cache WHERE key = ?",
                (key,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    # Update access time and count
                    await db.execute(
                        "UPDATE cache SET accessed_at = ?, access_count = access_count + 1 WHERE key = ?",
                        (datetime.now(), key)
                    )
                    await db.commit()
                    return row['value']
                return None
    
    async def set_cache(self, key: str, value: str, ttl_hours: int = 24):
        """Set value in persistent cache with TTL"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT OR REPLACE INTO cache (key, value, created_at, accessed_at)
                VALUES (?, ?, ?, ?)
                """,
                (key, value, datetime.now(), datetime.now())
            )
            await db.commit()
    
    async def cleanup_expired_cache(self, ttl_hours: int = 24):
        """Remove expired cache entries"""
        cutoff_time = datetime.now() - timedelta(hours=ttl_hours)
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "DELETE FROM cache WHERE accessed_at < ?",
                (cutoff_time,)
            )
            await db.commit()
    
    async def save_request_history(self, prompt: str, response: str, instructions: str = None, 
                                 processing_time: float = None, user_id: str = None):
        """Save request to history"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO request_history (prompt, response, instructions, processing_time, user_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (prompt, response, instructions, processing_time, user_id)
            )
            await db.commit()
    
    async def get_request_history(self, limit: int = 100, user_id: str = None) -> List[Dict]:
        """Get recent request history"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query = "SELECT * FROM request_history"
            params = []
            
            if user_id:
                query += " WHERE user_id = ?"
                params.append(user_id)
            
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
    
    async def create_background_task(self, task_id: str, task_type: str, payload: Dict[str, Any]) -> str:
        """Create a new background task"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO background_tasks (task_id, task_type, payload, status)
                VALUES (?, ?, ?, 'pending')
                """,
                (task_id, task_type, json.dumps(payload))
            )
            await db.commit()
            return task_id
    
    async def update_task_status(self, task_id: str, status: str, result: str = None, error_message: str = None):
        """Update background task status"""
        async with aiosqlite.connect(self.db_path) as db:
            completed_at = datetime.now() if status in ['completed', 'failed'] else None
            await db.execute(
                """
                UPDATE background_tasks 
                SET status = ?, result = ?, error_message = ?, completed_at = ?
                WHERE task_id = ?
                """,
                (status, result, error_message, completed_at, task_id)
            )
            await db.commit()
    
    async def get_task_status(self, task_id: str) -> Optional[Dict]:
        """Get background task status"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM background_tasks WHERE task_id = ?",
                (task_id,)
            ) as cursor:
                row = await cursor.fetchone()
                return dict(row) if row else None
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics from database"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            # Get total cache entries
            async with db.execute("SELECT COUNT(*) as count FROM cache") as cursor:
                total_entries = (await cursor.fetchone())['count']
            
            # Get cache size in bytes
            async with db.execute("SELECT SUM(LENGTH(value)) as size FROM cache") as cursor:
                row = await cursor.fetchone()
                total_size = row['size'] if row['size'] else 0
            
            return {
                "total_entries": total_entries,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }

    async def save_lessons_history(self, user_id: str, query: str, lessons_json: str, processing_time: float = None, query_id: str = None):
        """Save generated lessons to lessons_history table"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO lessons_history (user_id, query, lessons_json, processing_time, query_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, query, lessons_json, processing_time, query_id)
            )
            await db.commit()

    async def save_related_questions_history(self, user_id: str, query: str, questions_json: str, processing_time: float = None, query_id: str = None):
        """Save generated related questions to related_questions_history table"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO related_questions_history (user_id, query, questions_json, processing_time, query_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, query, questions_json, processing_time, query_id)
            )
            await db.commit()

    async def save_flashcards_history(self, user_id: str, lesson_json: str, flashcards_json: str, processing_time: float = None, query_id: str = None):
        """Save generated flashcards to flashcards_history table"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO flashcards_history (user_id, lesson_json, flashcards_json, processing_time, query_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, lesson_json, flashcards_json, processing_time, query_id)
            )
            await db.commit()

    async def get_flashcards_history(self, limit: int = 50, user_id: str = None, query: str = None, query_id: str = None) -> List[Dict]:
        """Get recent flashcards history, optionally filtered by user_id, query, and query_id."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query_str = "SELECT * FROM flashcards_history"
            params = []
            where_clauses = []
            if user_id:
                where_clauses.append("user_id = ?")
                params.append(user_id)
            if query:
                where_clauses.append("lesson_json LIKE ?")
                params.append(f'%{query}%')
            if query_id:
                where_clauses.append("query_id = ?")
                params.append(query_id)
            if where_clauses:
                query_str += " WHERE " + " AND ".join(where_clauses)
            query_str += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            async with db.execute(query_str, params) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_related_questions_history(self, limit: int = 50, user_id: str = None, query: str = None, query_id: str = None) -> List[Dict]:
        """Get recent related questions history, optionally filtered by user_id, query, and query_id."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query_str = "SELECT * FROM related_questions_history"
            params = []
            where_clauses = []
            if user_id:
                where_clauses.append("user_id = ?")
                params.append(user_id)
            if query:
                where_clauses.append("query = ?")
                params.append(query)
            if query_id:
                where_clauses.append("query_id = ?")
                params.append(query_id)
            if where_clauses:
                query_str += " WHERE " + " AND ".join(where_clauses)
            query_str += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            async with db.execute(query_str, params) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def get_lessons_history(self, limit: int = 50, user_id: str = None, query: str = None, query_id: str = None) -> List[Dict]:
        """Get recent lessons history, optionally filtered by user_id, query, and query_id."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            query_str = "SELECT * FROM lessons_history"
            params = []
            where_clauses = []
            if user_id and query:
                where_clauses.append("user_id = ? AND query = ?")
                params.extend([user_id, query])
            elif user_id:
                where_clauses.append("user_id = ?")
                params.append(user_id)
            elif query:
                where_clauses.append("query = ?")
                params.append(query)
            if query_id:
                where_clauses.append("query_id = ?")
                params.append(query_id)
            if where_clauses:
                query_str += " WHERE " + " AND ".join(where_clauses)
            query_str += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            async with db.execute(query_str, params) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

# Global database instance
db = Database() 