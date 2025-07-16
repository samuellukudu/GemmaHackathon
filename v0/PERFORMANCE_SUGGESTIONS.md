# Improving Background Task Concurrency and Startup Latency

## Problem Summary
- When a user enters a query, all background tasks are executed sequentially before returning a completion, causing a long wait (5-10 minutes) before the app is usable.
- This is especially problematic on lower-end hardware.
- The goal is to ensure background tasks (such as completions, batch completions, lesson/flashcard generation, etc.) are executed concurrently, not sequentially, to minimize user wait time and maximize throughput.

---

## Diagnosis
1. **Current Implementation**
   - The backend uses a custom `TaskQueue` (see `backend/task_queue.py`) with asyncio and a worker pool.
   - Tasks are submitted to an asyncio queue and processed by a configurable number of worker coroutines.
   - The number of workers is set based on CPU cores (default: half the cores, min 2).
   - Some endpoints (e.g., `/api/completions`, `/api/completions/batch`) submit tasks to the queue for background processing.
   - Some endpoints (e.g., `/api/lessons`, `/api/query`) use `asyncio.gather` or `asyncio.create_task` for concurrent sub-tasks (e.g., generating flashcards for each lesson).

2. **Observed Issues**
   - On startup, or when a query is submitted, all background tasks are executed sequentially, not concurrently.
   - This leads to long delays before the user receives a response or the app is ready.
   - Possible causes:
     - The number of workers is too low for the workload.
     - Some code paths (e.g., batch processing, flashcard generation) use blocking loops instead of concurrent execution.
     - Some async tasks may be awaited sequentially instead of being scheduled concurrently.
     - Heavy tasks may be CPU-bound, blocking the event loop.

---

## Detailed Plan to Fix

### 1. **Increase Worker Concurrency**
- **Action:**
  - Review and increase the number of workers in `TaskQueue` (`max_workers`).
  - Make this configurable via environment variable (already supported: `TASK_QUEUE_WORKERS`).
  - On low-end hardware, experiment with 4-8 workers (or more if I/O-bound).
- **Code:**
  - In `backend/config.py`, set `TASK_QUEUE_WORKERS` to a higher value if needed.
  - In `backend/task_queue.py`, ensure `max_workers` is set from config.

### 2. **Ensure True Concurrency in Task Processing**
- **Action:**
  - In `TaskQueue`, verify that each worker runs independently and processes tasks as soon as they are available.
  - Avoid any global locks or bottlenecks that would serialize task execution.
  - For batch tasks (e.g., batch completions, flashcard generation), use `asyncio.gather` to run sub-tasks concurrently.
- **Code:**
  - Refactor any `for` loops that await each sub-task sequentially to use `asyncio.gather` or `asyncio.create_task`.
  - Example:
    ```python
    # BAD: sequential
    for prompt in prompts:
        response = await get_completions(prompt, instructions)
    # GOOD: concurrent
    tasks = [get_completions(prompt, instructions) for prompt in prompts]
    results = await asyncio.gather(*tasks)
    ```

### 3. **Optimize Startup and First-Request Latency**
- **Action:**
  - Ensure that on startup, the app does not block on long-running background tasks.
  - Use FastAPI's `BackgroundTasks` or schedule non-critical initialization with `asyncio.create_task`.
  - For endpoints, return immediately after scheduling background work, and provide a status endpoint for progress/results.
- **Code:**
  - In `main.py`, ensure `startup_event` only initializes resources, not heavy computation.
  - In endpoints, use background task submission and return 202/accepted responses with task IDs.

### 4. **Profile and Identify Blocking Code**
- **Action:**
  - Use logging and profiling to identify any blocking (CPU-bound or synchronous) code in the background task handlers.
  - Offload CPU-bound work to a thread/process pool if necessary.
- **Code:**
  - Use `asyncio.to_thread` or `concurrent.futures.ThreadPoolExecutor` for blocking code.

### 5. **Best Practices and Monitoring**
- **Action:**
  - Add monitoring/logging for queue size, worker utilization, and task latency.
  - Alert if queue size grows too large or tasks are delayed.
- **Code:**
  - Use the `get_queue_stats()` method in `TaskQueue` for monitoring.
  - Add periodic logging of queue stats.

---

## Additional Suggestions and Advanced Improvements

### 6. **Graceful Degradation and User Feedback**
- **Action:**
  - Implement user-facing feedback for long-running tasks (e.g., progress updates, estimated time remaining, or notifications when tasks complete).
  - For tasks that may take a long time, consider providing partial results or streaming updates if possible.
- **Code:**
  - Use WebSockets or Server-Sent Events (SSE) to push progress updates to the frontend.
  - Add a polling endpoint for clients to check task progress and partial results.

### 7. **Task Prioritization and Throttling**
- **Action:**
  - Allow for prioritization of urgent tasks (e.g., user-initiated vs. batch jobs).
  - Implement throttling or rate-limiting to prevent overload on low-end hardware.
- **Code:**
  - Extend the `TaskQueue` to support priority queues (e.g., using `asyncio.PriorityQueue`).
  - Add per-user or global rate limits using middleware or a decorator.

### 8. **Timeouts and Task Cancellation**
- **Action:**
  - Set reasonable timeouts for background tasks to avoid resource starvation.
  - Allow users or admins to cancel tasks that are taking too long or are no longer needed.
- **Code:**
  - Use `asyncio.wait_for` to enforce timeouts on long-running tasks.
  - Add an API endpoint to cancel a background task by `task_id`.

### 9. **Persistence and Recovery**
- **Action:**
  - Ensure that in-progress or pending tasks are persisted to disk/database so they can be recovered after a crash or restart.
  - On startup, reload and resume any unfinished tasks.
- **Code:**
  - On app startup, query the database for tasks with status 'pending' or 'processing' and re-queue them.
  - Periodically checkpoint task progress for long-running jobs.

### 10. **Observability and Alerting**
- **Action:**
  - Add structured logging, metrics, and alerting for task queue health, worker failures, and slow tasks.
  - Integrate with monitoring tools (e.g., Prometheus, Grafana, Sentry).
- **Code:**
  - Emit logs for task submission, start, completion, failure, and cancellation.
  - Expose Prometheus metrics for queue size, task latency, worker utilization, etc.

### 11. **Testing and Validation**
- **Action:**
  - Add unit and integration tests for concurrent task execution, error handling, and recovery.
  - Simulate high load and failure scenarios to validate robustness.
- **Code:**
  - Use pytest-asyncio for async test cases.
  - Add tests for edge cases: task timeouts, cancellations, database failures, etc.

### 12. **Scalability Considerations**
- **Action:**
  - For future scaling, consider moving to a distributed task queue (e.g., Celery, RQ, or a message broker like RabbitMQ/Redis) if a single-process asyncio queue becomes a bottleneck.
- **Code:**
  - Abstract the task queue interface to allow swapping implementations in the future.

---

## Example Refactor: Batch Task Processing

**Before (sequential):**
```python
for prompt in prompts:
    response = await get_completions(prompt, instructions)
    results.append(response)
```

**After (concurrent):**
```python
tasks = [get_completions(prompt, instructions) for prompt in prompts]
results = await asyncio.gather(*tasks)
```

---

## Example: Adding Task Cancellation Endpoint
```python
@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    result = await task_queue.cancel_task(task_id)
    if result:
        return {"status": "cancelled"}
    else:
        raise HTTPException(status_code=404, detail="Task not found or already completed")
```

---

## Updated Checklist
- [ ] Increase `max_workers` for the task queue.
- [ ] Refactor batch and sub-task processing to use `asyncio.gather` or `asyncio.create_task`.
- [ ] Ensure endpoints return immediately after scheduling background work.
- [ ] Profile and offload any blocking code.
- [ ] Add monitoring/logging for queue and worker stats.
- [ ] Implement user feedback for long-running tasks.
- [ ] Add task prioritization and throttling.
- [ ] Support timeouts and cancellation for tasks.
- [ ] Ensure persistence and recovery of unfinished tasks.
- [ ] Add observability and alerting for task queue health.
- [ ] Add robust testing for concurrency and failure scenarios.
- [ ] Plan for future scalability (distributed queue).

---

## References
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [AsyncIO Concurrency Patterns](https://docs.python.org/3/library/asyncio-task.html)
- [Python Concurrency Best Practices](https://realpython.com/python-concurrency/) 