#!/usr/bin/env python3
"""
Simple test script to verify the backend is working
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_backend():
    print("Testing ATSPAM Backend...")
    print("=" * 40)
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Server is running: {response.status_code}")
        print(f"   Response: {response.json()}")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start the backend first.")
        return False
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        return False
    
    # Test 2: Test endpoint
    try:
        response = requests.get(f"{BASE_URL}/test")
        print(f"✅ Test endpoint: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")
        return False
    
    # Test 3: Test CORS (simulate frontend request)
    try:
        headers = {
            'Origin': 'http://localhost:5173',
            'Content-Type': 'application/json'
        }
        response = requests.options(f"{BASE_URL}/login", headers=headers)
        print(f"✅ CORS preflight: {response.status_code}")
        if 'access-control-allow-origin' in response.headers:
            print(f"   CORS headers: {response.headers.get('access-control-allow-origin')}")
        else:
            print("   ⚠️  CORS headers not found")
    except Exception as e:
        print(f"❌ Error testing CORS: {e}")
        return False
    
    print("\n🎉 Backend tests completed successfully!")
    return True

if __name__ == "__main__":
    test_backend() 