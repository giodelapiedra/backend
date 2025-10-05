#!/bin/bash
set -e

echo "Installing frontend dependencies..."
cd frontend
npm install

echo "Building frontend with disabled linting..."
export CI=false
export DISABLE_ESLINT_PLUGIN=true
npm run build

echo "Installing Netlify functions dependencies..."
cd ../netlify/functions
npm install

echo "Build completed successfully!"
