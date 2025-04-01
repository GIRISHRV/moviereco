#!/usr/bin/env bash

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p uploads/avatars

# Export PYTHONPATH to include the current directory
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Start the application
cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT