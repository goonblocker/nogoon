#!/usr/bin/env python3
"""
Simple test server for Railway deployment debugging
"""
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

print("=== Railway Test Server Starting ===", flush=True)
print(f"Python version: {sys.version}", flush=True)
print(f"Working directory: {os.getcwd()}", flush=True)
print(f"PORT environment: {os.getenv('PORT', 'NOT SET')}", flush=True)
print(f"Files in directory: {sorted(os.listdir('.'))}", flush=True)

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                "status": "healthy",
                "timestamp": "2025-01-02T22:00:00Z",
                "python": sys.version,
                "port": os.getenv('PORT', 'NOT SET')
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        # Custom logging to ensure output
        print(f"[{self.client_address[0]}] {format % args}", flush=True)

if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    print(f"\nStarting test server on port {port}...", flush=True)
    
    try:
        server = HTTPServer(('0.0.0.0', port), HealthHandler)
        print(f"✅ Server started successfully on port {port}", flush=True)
        print(f"✅ Health endpoint available at http://0.0.0.0:{port}/health", flush=True)
        server.serve_forever()
    except Exception as e:
        print(f"❌ Failed to start server: {e}", flush=True)
        sys.exit(1)