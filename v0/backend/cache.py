import asyncio
import hashlib
import json
from typing import Any, Callable, Dict, Tuple, Optional
from datetime import datetime, timedelta
from backend.database import db

class HybridCache:
    def __init__(self, maxsize=1000, ttl_hours=24):
        self.cache: Dict[str, Any] = {}
        self.order = []
        self.maxsize = maxsize
        self.ttl_hours = ttl_hours
        self.lock = asyncio.Lock()
        self.access_times: Dict[str, datetime] = {}
    
    def _generate_key(self, *args, **kwargs) -> str:
        """Generate a consistent cache key from arguments"""
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_str.encode()).hexdigest()
    
    async def get_cache(self, key: str) -> Optional[Any]:
        """Get value from cache only (no computation)"""
        cache_key = self._generate_key(key)
        # Try memory cache first
        async with self.lock:
            if cache_key in self.cache:
                # Check TTL
                if self._is_expired(cache_key):
                    del self.cache[cache_key]
                    self.order.remove(cache_key)
                    del self.access_times[cache_key]
                    return None
                else:
                    # Update access time and move to end
                    self.access_times[cache_key] = datetime.now()
                    if cache_key in self.order:
                        self.order.remove(cache_key)
                    self.order.append(cache_key)
                    return self.cache[cache_key]
        
        # Try database cache
        db_result = await db.get_cache(cache_key)
        if db_result:
            try:
                result = json.loads(db_result)
                # Store in memory cache
                async with self.lock:
                    self._add_to_memory_cache(cache_key, result)
                return result
            except json.JSONDecodeError:
                pass
        
        return None

    async def get_or_set(self, key: Tuple, coro: Callable, *args, **kwargs):
        """Get from cache or compute and store result"""
        cache_key = self._generate_key(key, *args, **kwargs)
        
        # Try memory cache first
        async with self.lock:
            if cache_key in self.cache:
                # Check TTL
                if self._is_expired(cache_key):
                    del self.cache[cache_key]
                    self.order.remove(cache_key)
                    del self.access_times[cache_key]
                else:
                    # Update access time and move to end
                    self.access_times[cache_key] = datetime.now()
                    if cache_key in self.order:
                        self.order.remove(cache_key)
                    self.order.append(cache_key)
                    return self.cache[cache_key]
        
        # Try database cache
        db_result = await db.get_cache(cache_key)
        if db_result:
            try:
                result = json.loads(db_result)
                # Store in memory cache
                async with self.lock:
                    self._add_to_memory_cache(cache_key, result)
                return result
            except json.JSONDecodeError:
                pass
        
        # Not cached, compute result
        result = await coro(*args, **kwargs)
        
        # Store in both memory and database
        async with self.lock:
            self._add_to_memory_cache(cache_key, result)
        
        # Store in database (async, don't wait)
        asyncio.create_task(self._store_in_database(cache_key, result))
        
        return result
    
    def _add_to_memory_cache(self, key: str, value: Any):
        """Add item to memory cache with LRU eviction"""
        if key in self.cache:
            # Update existing
            self.order.remove(key)
        else:
            # Check if we need to evict
            if len(self.order) >= self.maxsize:
                oldest = self.order.pop(0)
                del self.cache[oldest]
                del self.access_times[oldest]
        
        self.cache[key] = value
        self.order.append(key)
        self.access_times[key] = datetime.now()
    
    async def set_cache(self, key: str, value: Any, ttl_hours: int = 24):
        """Set value in cache with TTL"""
        cache_key = self._generate_key(key)
        
        # Store in memory cache
        async with self.lock:
            self._add_to_memory_cache(cache_key, value)
        
        # Store in database (async, don't wait)
        asyncio.create_task(self._store_in_database(cache_key, value))
    
    async def _store_in_database(self, key: str, value: Any):
        """Store value in database cache"""
        try:
            await db.set_cache(key, json.dumps(value), self.ttl_hours)
        except Exception as e:
            print(f"Failed to store in database cache: {e}")
    
    def _is_expired(self, key: str) -> bool:
        """Check if cache entry is expired"""
        if key not in self.access_times:
            return True
        
        cutoff_time = datetime.now() - timedelta(hours=self.ttl_hours)
        return self.access_times[key] < cutoff_time
    
    async def clear(self):
        """Clear both memory and database cache"""
        async with self.lock:
            self.cache.clear()
            self.order.clear()
            self.access_times.clear()
        
        # Clear database cache in background
        asyncio.create_task(self._clear_database_cache())
    
    async def _clear_database_cache(self):
        """Clear database cache"""
        try:
            await db.cleanup_expired_cache(0)  # Remove all entries
        except Exception as e:
            print(f"Failed to clear database cache: {e}")
    
    async def cleanup_expired(self):
        """Remove expired entries from memory cache"""
        async with self.lock:
            expired_keys = [
                key for key in self.cache.keys()
                if self._is_expired(key)
            ]
            
            for key in expired_keys:
                del self.cache[key]
                if key in self.order:
                    self.order.remove(key)
                if key in self.access_times:
                    del self.access_times[key]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "memory_cache_size": len(self.cache),
            "max_size": self.maxsize,
            "ttl_hours": self.ttl_hours,
            "memory_usage_mb": self._estimate_memory_usage()
        }
    
    def _estimate_memory_usage(self) -> float:
        """Estimate memory usage in MB"""
        total_size = 0
        for key, value in self.cache.items():
            total_size += len(str(key)) + len(str(value))
        return total_size / (1024 * 1024)  # Convert to MB

# Initialize enhanced cache
cache = HybridCache(maxsize=1000, ttl_hours=24) 