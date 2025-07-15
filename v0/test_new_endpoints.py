#!/usr/bin/env python3
"""
Test script for the new lessons and related questions endpoints
"""

import asyncio
import httpx
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

async def test_lessons_endpoint():
    """Test the lessons generation endpoint"""
    test_data = {
        "query": "How does photosynthesis work?",
        "user_id": "test_user"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/api/lessons",
                json=test_data,
                timeout=30.0
            )
            print(f"Lessons endpoint status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Success: {result['success']}")
                print(f"Processing time: {result['processing_time']:.3f}s")
                print(f"Number of lessons: {len(result['lessons'])}")
                
                # Print first lesson as example
                if result['lessons']:
                    print(f"First lesson: {result['lessons'][0]['title']}")
                return True
            else:
                print(f"Error: {response.text}")
                return False
        except Exception as e:
            print(f"Exception during lessons test: {e}")
            return False

async def test_related_questions_endpoint():
    """Test the related questions generation endpoint"""
    test_data = {
        "query": "How does photosynthesis work?",
        "user_id": "test_user"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/api/related-questions",
                json=test_data,
                timeout=30.0
            )
            print(f"Related questions endpoint status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Success: {result['success']}")
                print(f"Processing time: {result['processing_time']:.3f}s")
                print(f"Number of related questions: {len(result['related_questions'])}")
                
                # Print first question as example
                if result['related_questions']:
                    print(f"First question: {result['related_questions'][0]['question']}")
                return True
            else:
                print(f"Error: {response.text}")
                return False
        except Exception as e:
            print(f"Exception during related questions test: {e}")
            return False

async def test_health_endpoint():
    """Test the health endpoint to make sure server is running"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/api/health", timeout=10.0)
            print(f"Health check status: {response.status_code}")
            return response.status_code == 200
        except Exception as e:
            print(f"Health check failed: {e}")
            return False

async def main():
    """Run all tests"""
    print("Testing New API Endpoints...")
    print("=" * 50)
    
    # Test health endpoint first
    print("\n1. Testing health endpoint...")
    health_ok = await test_health_endpoint()
    
    if not health_ok:
        print("❌ Server is not running. Please start the backend first.")
        return
    
    # Test lessons endpoint
    print("\n2. Testing lessons endpoint...")
    lessons_ok = await test_lessons_endpoint()
    
    # Test related questions endpoint
    print("\n3. Testing related questions endpoint...")
    questions_ok = await test_related_questions_endpoint()
    
    print("\n" + "=" * 50)
    print("Test Results:")
    print(f"Health endpoint: {'✓' if health_ok else '✗'}")
    print(f"Lessons endpoint: {'✓' if lessons_ok else '✗'}")
    print(f"Related questions endpoint: {'✓' if questions_ok else '✗'}")
    
    if health_ok and lessons_ok and questions_ok:
        print("\n✅ All new endpoints are working correctly!")
    else:
        print("\n❌ Some tests failed")
        if not lessons_ok:
            print("⚠️  Lessons endpoint failed - check LLM service and JSON response format")
        if not questions_ok:
            print("⚠️  Related questions endpoint failed - check LLM service and JSON response format")

if __name__ == "__main__":
    asyncio.run(main()) 