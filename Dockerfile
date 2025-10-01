# Railway Dockerfile for backend-only deployment
FROM python:3.11-slim

# Set working directory to backend
WORKDIR /app

# Copy only backend files
COPY backend/ ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE $PORT

# Start the FastAPI server
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]