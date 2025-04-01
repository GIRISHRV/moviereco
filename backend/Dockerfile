FROM python:3.9-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend directory contents into /app
COPY . .

# Create necessary directories
RUN mkdir -p uploads/avatars

# Create and make build script executable
RUN echo '#!/bin/bash\nexport PYTHONPATH=/app\nuvicorn app.main:app --host 0.0.0.0 --port $PORT' > build.sh && \
    chmod +x build.sh

# Set PYTHONPATH
ENV PYTHONPATH=/app

# Set the start command
CMD ["./build.sh"]