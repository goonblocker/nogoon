# Dockerfile for Railway backend deployment
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy only the backend files
COPY requirements.txt ./
COPY *.py ./
COPY app/ ./app/
COPY start.sh ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Set default port for Railway
ENV PORT=8000

# Expose port
EXPOSE $PORT

# Make start script executable and use it
RUN chmod +x start.sh

# Start the FastAPI server with debug script
CMD ["./start.sh"]