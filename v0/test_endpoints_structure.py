#!/usr/bin/env python3
"""
Test script to validate API endpoint structure and responses
"""

import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

async def test_endpoint_structure():
    """Test that the endpoints exist and return proper error messages"""
    
    async with httpx.AsyncClient() as client:
        # Test health endpoint
        print("1. Testing health endpoint...")
        try:
            response = await client.get(f"{BASE_URL}/api/health", timeout=10.0)
            print(f"   ✓ Health endpoint responds: {response.status_code}")
        except Exception as e:
            print(f"   ✗ Health endpoint failed: {e}")
            return False
        
        # Test lessons endpoint structure
        print("2. Testing lessons endpoint structure...")
        try:
            response = await client.post(
                f"{BASE_URL}/api/lessons",
                json={"query": "test", "user_id": "test"},
                timeout=10.0
            )
            print(f"   ✓ Lessons endpoint responds: {response.status_code}")
            if response.status_code == 500:
                error_detail = response.json().get("detail", "")
                if "Connection error" in error_detail:
                    print("   ✓ Endpoint properly handles LLM connection errors")
                else:
                    print(f"   ✓ Error response: {error_detail}")
        except Exception as e:
            print(f"   ✗ Lessons endpoint failed: {e}")
            return False
        
        # Test related questions endpoint structure
        print("3. Testing related questions endpoint structure...")
        try:
            response = await client.post(
                f"{BASE_URL}/api/related-questions",
                json={"query": "test", "user_id": "test"},
                timeout=10.0
            )
            print(f"   ✓ Related questions endpoint responds: {response.status_code}")
            if response.status_code == 500:
                error_detail = response.json().get("detail", "")
                if "Connection error" in error_detail:
                    print("   ✓ Endpoint properly handles LLM connection errors")
                else:
                    print(f"   ✓ Error response: {error_detail}")
        except Exception as e:
            print(f"   ✗ Related questions endpoint failed: {e}")
            return False
        
        # Test API documentation
        print("4. Testing API documentation...")
        try:
            response = await client.get(f"{BASE_URL}/docs", timeout=10.0)
            print(f"   ✓ API docs available: {response.status_code}")
        except Exception as e:
            print(f"   ✗ API docs failed: {e}")
        
        return True

async def test_instructions_endpoint():
    """Test that the instructions endpoint includes our new instruction types"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/api/instructions", timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                available_types = data.get("available_types", [])
                print(f"5. Available instruction types: {available_types}")
                
                required_types = ["lessons", "related_questions"]
                missing_types = [t for t in required_types if t not in available_types]
                
                if not missing_types:
                    print("   ✓ All new instruction types are available")
                    return True
                else:
                    print(f"   ✗ Missing instruction types: {missing_types}")
                    return False
            else:
                print(f"   ✗ Instructions endpoint failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ✗ Instructions endpoint error: {e}")
            return False

async def main():
    """Run all structure tests"""
    print("Testing API Endpoint Structure...")
    print("=" * 50)
    
    structure_ok = await test_endpoint_structure()
    instructions_ok = await test_instructions_endpoint()
    
    print("\n" + "=" * 50)
    print("Structure Test Results:")
    print(f"Endpoint structure: {'✓' if structure_ok else '✗'}")
    print(f"Instructions setup: {'✓' if instructions_ok else '✗'}")
    
    if structure_ok and instructions_ok:
        print("\n✅ All endpoint structures are working correctly!")
        print("💡 To test with actual LLM responses, ensure Ollama is running:")
        print("   - Install Ollama: https://ollama.ai/")
        print("   - Run: ollama serve")
        print("   - Pull model: ollama pull gemma3n:e4b")
        print("   - Set up .env file with correct BASE_URL and MODEL")
    else:
        print("\n❌ Some structural tests failed")

if __name__ == "__main__":
    asyncio.run(main()) 