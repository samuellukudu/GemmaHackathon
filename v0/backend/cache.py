import asyncio
from typing import Any, Callable, Dict, Tuple

class AsyncLRUCache:
    def __init__(self, maxsize=100_000):  # Optimized for 16GB RAM
        self.cache: Dict[Tuple, Any] = {}
        self.order = []
        self.maxsize = maxsize
        self.lock = asyncio.Lock()

    async def get_or_set(self, key: Tuple, coro: Callable, *args, **kwargs):
        async with self.lock:
            if key in self.cache:
                # Move key to end to show it was recently used
                self.order.remove(key)
                self.order.append(key)
                return self.cache[key]
        # Not cached, compute result
        result = await coro(*args, **kwargs)
        async with self.lock:
            self.cache[key] = result
            self.order.append(key)
            if len(self.order) > self.maxsize:
                oldest = self.order.pop(0)
                del self.cache[oldest]
        return result

# Initialize cache with optimized size for 16GB RAM
cache = AsyncLRUCache()  # Uses default maxsize=100_000 