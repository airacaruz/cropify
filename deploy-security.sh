#!/bin/bash

# Security Headers Deployment Script for Cropify
# This script builds and deploys the application with enhanced security headers

echo "🔒 Deploying Cropify with Enhanced Security Headers..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

echo "📦 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "🚀 Deploying to Firebase..."
firebase deploy

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🔍 Security Headers Implemented:"
    echo "  ✓ Content-Security-Policy"
    echo "  ✓ X-Frame-Options: DENY"
    echo "  ✓ X-Content-Type-Options: nosniff"
    echo "  ✓ Referrer-Policy: strict-origin-when-cross-origin"
    echo "  ✓ Permissions-Policy: Restricted dangerous features"
    echo ""
    echo "🧪 Test your security headers at:"
    echo "  https://securityheaders.com/?q=https://cropify-8e68d.web.app/"
    echo "  https://observatory.mozilla.org/analyze/cropify-8e68d.web.app"
    echo ""
    echo "📚 Documentation: SECURITY_HEADERS.md"
else
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi


