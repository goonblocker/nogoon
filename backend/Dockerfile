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

# Railway provides PORT dynamically, no need to expose

# Make start scripts executable
RUN chmod +x start.sh start_minimal.sh start_debug.sh

# Start the actual FastAPI application
CMD ["sh", "-c", "python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]