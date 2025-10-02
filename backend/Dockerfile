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

# Set default port for Railway
ENV PORT=8000

# Expose port
EXPOSE $PORT

# Make start scripts executable
RUN chmod +x start.sh start_minimal.sh start_debug.sh

# Start the FastAPI server
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]