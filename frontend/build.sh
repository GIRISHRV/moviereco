#!/bin/bash
# Clean up
rm -rf dist
# Create dist directory
mkdir -p dist
# Copy all frontend files
cp -r assets dist/
cp -r components dist/
cp *.html dist/
cp *.js dist/