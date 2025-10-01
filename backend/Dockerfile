# Dockerfile for Railway backend deployment
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy only the backend files
COPY requirements.txt ./
COPY *.py ./
COPY app/ ./app/

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE $PORT

# Start the FastAPI server
CMD uvicorn main:app --host 0.0.0.0 --port $PORT