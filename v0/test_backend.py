#!/usr/bin/env python3
"""
Test script for the FastAPI backend - can be run as a module
"""
import asyncio
import httpx
import json
from typing import Dict, Any

async def test_health_endpoint():
    """Test the health check endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/health")
        print(f"Health check status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200

async def test_instructions_endpoint():
    """Test the instructions endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/instructions")
        print(f"Instructions endpoint status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Available instruction types: {result['available_types']}")
            print(f"Default instruction preview: {result['default_instruction'][:100]}...")
            return True
        else:
            print(f"Error: {response.text}")
            return False

async def test_completion_endpoint():
    """Test the completion endpoint"""
    test_data = {
        "prompt": "Hello, how are you?",
        "instruction_type": "default"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/api/completions",
                json=test_data,
                timeout=30.0
            )
            print(f"Completion test status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Response: {result}")
                return True
            else:
                print(f"Error: {response.text}")
                return False
        except Exception as e:
            print(f"Exception during completion test: {e}")
            return False

async def test_completion_with_custom_instructions():
    """Test the completion endpoint with custom instructions"""
    test_data = {
        "prompt": "Explain quantum computing in simple terms",
        "instructions": "You are a helpful teacher. Explain complex topics using simple analogies and everyday examples."
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/api/completions",
                json=test_data,
                timeout=30.0
            )
            print(f"Custom instructions completion test status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Response: {result}")
                return True
            else:
                print(f"Error: {response.text}")
                return False
        except Exception as e:
            print(f"Exception during custom instructions test: {e}")
            return False

async def test_cache_endpoints():
    """Test cache management endpoints"""
    async with httpx.AsyncClient() as client:
        # Test cache stats
        response = await client.get("http://localhost:8000/api/cache/stats")
        print(f"Cache stats status: {response.status_code}")
        print(f"Cache stats: {response.json()}")
        
        # Test cache clear
        response = await client.delete("http://localhost:8000/api/cache/clear")
        print(f"Cache clear status: {response.status_code}")
        print(f"Cache clear response: {response.json()}")
        
        return True

async def main():
    """Run all tests"""
    print("Testing FastAPI Backend...")
    print("=" * 40)
    
    # Test health endpoint
    print("\n1. Testing health endpoint...")
    health_ok = await test_health_endpoint()
    
    # Test instructions endpoint
    print("\n2. Testing instructions endpoint...")
    instructions_ok = await test_instructions_endpoint()
    
    # Test cache endpoints
    print("\n3. Testing cache endpoints...")
    cache_ok = await test_cache_endpoints()
    
    # Test completion endpoint (may fail if no LLM service is running)
    print("\n4. Testing completion endpoint...")
    completion_ok = await test_completion_endpoint()
    
    # Test completion with custom instructions
    print("\n5. Testing completion with custom instructions...")
    custom_completion_ok = await test_completion_with_custom_instructions()
    
    print("\n" + "=" * 40)
    print("Test Results:")
    print(f"Health endpoint: {'✓' if health_ok else '✗'}")
    print(f"Instructions endpoint: {'✓' if instructions_ok else '✗'}")
    print(f"Cache endpoints: {'✓' if cache_ok else '✗'}")
    print(f"Completion endpoint: {'✓' if completion_ok else '✗'}")
    print(f"Custom instructions completion: {'✓' if custom_completion_ok else '✗'}")
    
    if health_ok and instructions_ok and cache_ok:
        print("\n✅ Backend is working correctly!")
        if not completion_ok or not custom_completion_ok:
            print("⚠️  Completion endpoints failed - this is normal if no LLM service is running")
    else:
        print("\n❌ Some tests failed")

if __name__ == "__main__":
    asyncio.run(main()) 