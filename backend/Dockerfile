# Dockerfile for Railway backend deployment
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy only the backend files
COPY requirements.txt ./
COPY *.py ./
COPY app/ ./app/
COPY start.sh ./
COPY start_minimal.sh ./
COPY start_debug.sh ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Railway will provide PORT environment variable
# EXPOSE is for documentation, Railway ignores it
EXPOSE 8000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8000}/health')" || exit 1

# Make start scripts executable
RUN chmod +x start.sh start_minimal.sh start_debug.sh

# Start the FastAPI server directly with Python using Railway's PORT
CMD ["sh", "-c", "python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]