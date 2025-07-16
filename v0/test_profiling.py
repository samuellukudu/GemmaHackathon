#!/usr/bin/env python3
"""
Test script to demonstrate profiling and blocking code detection.
This script simulates various scenarios to test the profiler.
"""

import asyncio
import time
import json
from backend.profiler import profiler, profile_task, run_blocking_safely
from backend.task_queue import task_queue
from backend.database import db

# Test functions to demonstrate profiling

@profile_task("test.fast_async_function")
async def fast_async_function():
    """A fast async function that should not trigger blocking warnings"""
    await asyncio.sleep(0.01)  # 10ms
    return "fast_result"

@profile_task("test.slow_async_function")
async def slow_async_function():
    """A slow async function to test performance monitoring"""
    await asyncio.sleep(2.0)  # 2 seconds
    return "slow_result"

@profile_task("test.blocking_function")
async def blocking_cpu_function():
    """A function that performs CPU-intensive work (blocking)"""
    # Simulate CPU-intensive work
    start = time.time()
    while time.time() - start < 0.2:  # Block for 200ms
        _ = sum(i * i for i in range(1000))
    return "blocking_result"

@profile_task("test.safe_blocking_function")
async def safe_blocking_function():
    """A function that safely runs blocking code in a thread pool"""
    def cpu_intensive_work():
        start = time.time()
        while time.time() - start < 0.2:  # Block for 200ms
            _ = sum(i * i for i in range(1000))
        return "safe_blocking_result"
    
    # Run blocking code safely in thread pool
    result = await run_blocking_safely(cpu_intensive_work)
    return result

@profile_task("test.error_prone_function")
async def error_prone_function():
    """A function that sometimes fails to test error tracking"""
    import random
    if random.random() < 0.3:  # 30% chance of error
        raise ValueError("Simulated error")
    await asyncio.sleep(0.05)
    return "success_result"

async def test_concurrent_tasks():
    """Test concurrent execution vs sequential execution"""
    print("\n=== Testing Concurrent vs Sequential Execution ===")
    
    # Sequential execution (bad)
    print("\n1. Sequential execution:")
    start_time = time.time()
    for i in range(3):
        await fast_async_function()
    sequential_time = time.time() - start_time
    print(f"Sequential time: {sequential_time:.3f}s")
    
    # Concurrent execution (good)
    print("\n2. Concurrent execution:")
    start_time = time.time()
    tasks = [fast_async_function() for _ in range(3)]
    await asyncio.gather(*tasks)
    concurrent_time = time.time() - start_time
    print(f"Concurrent time: {concurrent_time:.3f}s")
    print(f"Speedup: {sequential_time/concurrent_time:.1f}x")

async def test_blocking_detection():
    """Test blocking code detection"""
    print("\n=== Testing Blocking Code Detection ===")
    
    print("\n1. Running fast async function (should not trigger warnings):")
    await fast_async_function()
    
    print("\n2. Running blocking CPU function (should trigger blocking warning):")
    await blocking_cpu_function()
    
    print("\n3. Running safe blocking function (should not trigger blocking warning):")
    await safe_blocking_function()

async def test_error_tracking():
    """Test error tracking in profiler"""
    print("\n=== Testing Error Tracking ===")
    
    # Run error-prone function multiple times
    for i in range(10):
        try:
            await error_prone_function()
        except ValueError:
            pass  # Expected errors

async def test_task_queue_profiling():
    """Test task queue profiling"""
    print("\n=== Testing Task Queue Profiling ===")
    
    # Submit some test tasks
    task_ids = []
    for i in range(3):
        task_id = await task_queue.submit_task('completion', {
            'prompt': f'Test prompt {i}',
            'instructions': 'Respond with a short test message.',
            'user_id': 'test_user'
        })
        task_ids.append(task_id)
        print(f"Submitted task {i+1}: {task_id}")
    
    # Wait a bit for tasks to process
    print("Waiting for tasks to process...")
    await asyncio.sleep(5)
    
    # Check task results
    for i, task_id in enumerate(task_ids):
        status = await task_queue.get_task_status(task_id)
        print(f"Task {i+1} status: {status}")

async def main():
    """Main test function"""
    print("Starting profiling tests...")
    
    # Initialize database
    await db.init()
    
    # Start task queue
    await task_queue.start()
    
    try:
        # Run various tests
        await test_concurrent_tasks()
        await test_blocking_detection()
        await test_error_tracking()
        await test_task_queue_profiling()
        
        # Generate performance report
        print("\n=== Performance Report ===")
        profiler.log_performance_summary()
        
        # Get detailed metrics
        report = profiler.get_performance_report()
        print("\n=== Detailed Metrics ===")
        print(json.dumps(report, indent=2, default=str))
        
        # Test task queue performance metrics
        print("\n=== Task Queue Metrics ===")
        queue_metrics = task_queue.get_performance_metrics()
        print(json.dumps(queue_metrics, indent=2, default=str))
        
    finally:
        # Cleanup
        await task_queue.stop()
        profiler.shutdown()

if __name__ == "__main__":
    asyncio.run(main())