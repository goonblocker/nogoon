#!/usr/bin/env python3
"""
Ultra-simple test to verify Python execution on Railway
"""
import sys
import os

print("=== SIMPLE TEST STARTING ===")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")
print(f"Files in directory: {os.listdir('.')}")
print(f"PORT environment variable: {os.getenv('PORT', 'NOT SET')}")
print("=== SIMPLE TEST COMPLETE ===")

# Try to start a basic HTTP server
try:
    print("Starting basic HTTP server...")
    import http.server
    import socketserver
    
    port = int(os.getenv('PORT', 8000))
    print(f"Server will run on port: {port}")
    
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Server started on port {port}")
        httpd.serve_forever()
        
except Exception as e:
    print(f"Error starting server: {e}")
    import traceback
    traceback.print_exc()
