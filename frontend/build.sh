#!/bin/bash

# Clean up
rm -rf dist

# Create dist directory
mkdir -p dist
mkdir -p dist/pages
mkdir -p dist/assets/css
mkdir -p dist/assets/js
mkdir -p dist/assets/images

# Copy HTML files
cp *.html dist/
cp pages/*.html dist/pages/

# Copy assets
cp -r assets/css/* dist/assets/css/
cp -r assets/js/* dist/assets/js/
cp -r assets/images/* dist/assets/images/

# Fix permissions
chmod -R 755 dist