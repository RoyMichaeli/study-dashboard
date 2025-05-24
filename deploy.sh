#!/bin/bash

echo "🚀 Building and deploying study dashboard..."

# Build the project
echo "📦 Building project..."
npm run build

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete!"
echo "🔥 Firebase-first mode is now live!"