#!/usr/bin/env bash

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p uploads/avatars

# Export PYTHONPATH to include the current directory
export PYTHONPATH=$PYTHONPATH:$(pwd)
