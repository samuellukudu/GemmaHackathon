# Performance Suggestions for GemmaHackathon Backend

This document summarizes code-level suggestions to optimize the backend for efficient, responsive operation on a wide range of laptops. These focus on the API layer, background task/queue, cache, and database. (LLM/model changes are excluded as per requirements.)

---

## 1. API Layer

### a. Avoid Blocking Operations ✅ **IMPLEMENTED**
- ✅ Ensure all I/O (DB, cache, LLM calls) is truly async.
- ✅ Avoid synchronous file or network operations in endpoints.

**Changes Made:**
- Moved `import asyncio` to the top of routes.py for better organization
- Changed `time.time()` to `time.perf_counter()` for more accurate timing
- Made cache writes non-blocking by using `asyncio.create_task()` instead of `await`
- Made performance monitoring non-blocking by using `asyncio.to_thread()`
- Made database history saves non-blocking (already implemented)
- Fixed cache methods to handle both tuple and string keys properly

### b. Fast Return for Background Tasks
- For long LLM tasks, consider always returning quickly and letting the client poll for results.
- For synchronous requests, set a timeout (e.g., 10–15s); if exceeded, auto-convert to background.

---

## 2. Background Task & Queue System

### a. Queue Backpressure & Limits
- Add a max queue size (e.g., 100 tasks). If full, reject new tasks with a clear error.

```python
MAX_QUEUE_SIZE = 100  # Set as appropriate

async def submit_task(self, task_type: str, payload: Dict[str, Any]) -> str:
    if self._queue.qsize() >= MAX_QUEUE_SIZE:
        raise Exception("Task queue is full, try again later.")
    # ... existing code ...
```

### b. Worker Utilization & Monitoring
- Log queue length and worker status periodically for monitoring.
- Optionally, make worker count configurable at runtime.

### c. Result Retention
- If memory is tight, reduce retention time or store only in DB.

---

## 3. Cache Layer

### a. Cache Key Granularity
- Ensure the cache key includes all relevant parameters (e.g., user_id if responses are user-specific).
- Use a consistent, canonical form for prompts (e.g., strip whitespace, lowercase if appropriate).

### b. Cache Size & TTL
- Monitor hit/miss rates and tune `CACHE_MAX_SIZE` and `CACHE_TTL_HOURS` for your workload.

### c. Async Lock Scope
- Keep lock scope as small as possible to avoid blocking other coroutines.

---

## 4. Database Access

### a. Use WAL Mode for SQLite
- Enable Write-Ahead Logging (WAL) for better concurrency:

```python
async with aiosqlite.connect(self.db_path) as db:
    await db.execute("PRAGMA journal_mode=WAL;")
    # ... existing table creation code ...
```

### b. Batch Writes (if possible)
- If you get bursts of requests, consider batching writes (e.g., collect in memory and flush every N seconds or M records).

### c. Indexing
- Add indexes to columns that are frequently queried (e.g., `user_id`, `created_at`).

---

## 5. General Monitoring & Profiling

- Add logging for:
  - Queue length
  - Cache hit/miss
  - DB write latency
  - Task processing time
- Expose a `/metrics` endpoint (or use Prometheus middleware) for real-time monitoring.

---

## 6. Example: Improve Cache Key

In `HybridCache._generate_key`:
- Normalize prompt and instructions before hashing (e.g., strip, lower, sort keys if dict).

---

## 7. Next Steps

- Prioritize and implement the above suggestions based on observed bottlenecks and available resources.
- Profile endpoints and monitor system resource usage to guide further optimization. 