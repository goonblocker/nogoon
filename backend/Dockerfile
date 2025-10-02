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

# Start minimal test server to debug Railway
CMD ["python3", "minimal_health_test.py"]