#!/usr/bin/env python3
"""
Performance testing script for the LLM backend
"""
import asyncio
import aiohttp
import time
import json
from typing import List, Dict, Any
import statistics

class PerformanceTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_single_completion(self, prompt: str) -> Dict[str, Any]:
        """Test a single completion request"""
        start_time = time.time()
        
        payload = {
            "prompt": prompt,
            "instruction_type": "default"
        }
        
        async with self.session.post(
            f"{self.base_url}/api/completions",
            json=payload
        ) as response:
            result = await response.json()
            processing_time = time.time() - start_time
            
            return {
                "status_code": response.status,
                "processing_time": processing_time,
                "response_time": result.get("processing_time", 0),
                "success": response.status == 200
            }
    
    async def test_background_completion(self, prompt: str) -> Dict[str, Any]:
        """Test a background completion request"""
        start_time = time.time()
        
        payload = {
            "prompt": prompt,
            "instruction_type": "default",
            "background": True
        }
        
        async with self.session.post(
            f"{self.base_url}/api/completions",
            json=payload
        ) as response:
            result = await response.json()
            submit_time = time.time() - start_time
            
            if response.status == 202:
                task_id = result["detail"]["task_id"]
                
                # Poll for completion
                max_wait = 60  # 60 seconds max
                poll_interval = 1
                waited = 0
                
                while waited < max_wait:
                    await asyncio.sleep(poll_interval)
                    waited += poll_interval
                    
                    async with self.session.get(
                        f"{self.base_url}/api/tasks/{task_id}"
                    ) as task_response:
                        task_result = await task_response.json()
                        status = task_result.get("status")
                        
                        if status == "completed":
                            total_time = time.time() - start_time
                            return {
                                "status_code": 200,
                                "submit_time": submit_time,
                                "total_time": total_time,
                                "task_id": task_id,
                                "success": True
                            }
                        elif status == "failed":
                            return {
                                "status_code": 500,
                                "submit_time": submit_time,
                                "error": task_result.get("error_message"),
                                "success": False
                            }
                
                return {
                    "status_code": 408,
                    "submit_time": submit_time,
                    "error": "Timeout waiting for completion",
                    "success": False
                }
            
            return {
                "status_code": response.status,
                "error": result,
                "success": False
            }
    
    async def test_batch_completion(self, prompts: List[str]) -> Dict[str, Any]:
        """Test batch completion"""
        start_time = time.time()
        
        payload = {
            "prompts": prompts,
            "instruction_type": "default"
        }
        
        async with self.session.post(
            f"{self.base_url}/api/completions/batch",
            json=payload
        ) as response:
            result = await response.json()
            submit_time = time.time() - start_time
            
            if response.status == 200:
                task_id = result["task_id"]
                
                # Poll for completion
                max_wait = 120  # 2 minutes max for batch
                poll_interval = 2
                waited = 0
                
                while waited < max_wait:
                    await asyncio.sleep(poll_interval)
                    waited += poll_interval
                    
                    async with self.session.get(
                        f"{self.base_url}/api/tasks/{task_id}"
                    ) as task_response:
                        task_result = await task_response.json()
                        status = task_result.get("status")
                        
                        if status == "completed":
                            total_time = time.time() - start_time
                            return {
                                "status_code": 200,
                                "submit_time": submit_time,
                                "total_time": total_time,
                                "task_id": task_id,
                                "success": True
                            }
                        elif status == "failed":
                            return {
                                "status_code": 500,
                                "submit_time": submit_time,
                                "error": task_result.get("error_message"),
                                "success": False
                            }
                
                return {
                    "status_code": 408,
                    "submit_time": submit_time,
                    "error": "Timeout waiting for batch completion",
                    "success": False
                }
            
            return {
                "status_code": response.status,
                "error": result,
                "success": False
            }
    
    async def test_concurrent_requests(self, num_requests: int, prompt: str) -> List[Dict[str, Any]]:
        """Test concurrent requests"""
        tasks = []
        for i in range(num_requests):
            task = self.test_single_completion(f"{prompt} (request {i+1})")
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r if not isinstance(r, Exception) else {"error": str(r), "success": False} for r in results]
    
    async def get_performance_stats(self) -> Dict[str, Any]:
        """Get current performance statistics"""
        async with self.session.get(f"{self.base_url}/api/performance") as response:
            return await response.json()
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        async with self.session.get(f"{self.base_url}/api/cache/stats") as response:
            return await response.json()

def print_results(test_name: str, results: List[Dict[str, Any]]):
    """Print test results with statistics"""
    print(f"\n=== {test_name} ===")
    
    if not results:
        print("No results")
        return
    
    successful_results = [r for r in results if r.get("success", False)]
    failed_results = [r for r in results if not r.get("success", False)]
    
    print(f"Total requests: {len(results)}")
    print(f"Successful: {len(successful_results)}")
    print(f"Failed: {len(failed_results)}")
    print(f"Success rate: {len(successful_results)/len(results)*100:.1f}%")
    
    if successful_results:
        processing_times = [r.get("processing_time", 0) for r in successful_results]
        response_times = [r.get("response_time", 0) for r in successful_results]
        
        print(f"\nProcessing times (seconds):")
        print(f"  Average: {statistics.mean(processing_times):.3f}")
        print(f"  Median: {statistics.median(processing_times):.3f}")
        print(f"  Min: {min(processing_times):.3f}")
        print(f"  Max: {max(processing_times):.3f}")
        
        if any(response_times):
            print(f"\nResponse times (seconds):")
            print(f"  Average: {statistics.mean(response_times):.3f}")
            print(f"  Median: {statistics.median(response_times):.3f}")
            print(f"  Min: {min(response_times):.3f}")
            print(f"  Max: {max(response_times):.3f}")
    
    if failed_results:
        print(f"\nFailed requests:")
        for result in failed_results[:5]:  # Show first 5 failures
            print(f"  - {result.get('error', 'Unknown error')}")

async def main():
    """Run performance tests"""
    print("Starting performance tests...")
    
    async with PerformanceTester() as tester:
        # Test prompts
        simple_prompt = "What is the capital of France?"
        complex_prompt = "Write a detailed explanation of how machine learning algorithms work, including examples of supervised and unsupervised learning."
        
        # 1. Single completion test
        print("\n1. Testing single completion...")
        result = await tester.test_single_completion(simple_prompt)
        print_results("Single Completion", [result])
        
        # 2. Background completion test
        print("\n2. Testing background completion...")
        result = await tester.test_background_completion(complex_prompt)
        print_results("Background Completion", [result])
        
        # 3. Concurrent requests test
        print("\n3. Testing concurrent requests...")
        results = await tester.test_concurrent_requests(5, simple_prompt)
        print_results("Concurrent Requests (5)", results)
        
        # 4. Batch completion test
        print("\n4. Testing batch completion...")
        batch_prompts = [
            "What is 2+2?",
            "Name three colors",
            "What is the weather like?",
            "Tell me a joke",
            "What is your favorite food?"
        ]
        result = await tester.test_batch_completion(batch_prompts)
        print_results("Batch Completion", [result])
        
        # 5. Performance statistics
        print("\n5. Getting performance statistics...")
        try:
            perf_stats = await tester.get_performance_stats()
            print("Performance Stats:")
            print(json.dumps(perf_stats, indent=2))
        except Exception as e:
            print(f"Failed to get performance stats: {e}")
        
        # 6. Cache statistics
        print("\n6. Getting cache statistics...")
        try:
            cache_stats = await tester.get_cache_stats()
            print("Cache Stats:")
            print(json.dumps(cache_stats, indent=2))
        except Exception as e:
            print(f"Failed to get cache stats: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 