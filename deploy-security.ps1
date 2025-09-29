# Security Headers Deployment Script for Cropify (PowerShell)
# This script builds and deploys the application with enhanced security headers

Write-Host "🔒 Deploying Cropify with Enhanced Security Headers..." -ForegroundColor Green

# Check if Firebase CLI is installed
try {
    firebase --version | Out-Null
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in to Firebase
try {
    firebase projects:list | Out-Null
} catch {
    Write-Host "❌ Not logged in to Firebase. Please login first:" -ForegroundColor Red
    Write-Host "firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Building the application..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix the errors and try again." -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deploying to Firebase..." -ForegroundColor Blue
firebase deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Security Headers Implemented:" -ForegroundColor Cyan
    Write-Host "  ✓ Content-Security-Policy" -ForegroundColor Green
    Write-Host "  ✓ X-Frame-Options: DENY" -ForegroundColor Green
    Write-Host "  ✓ X-Content-Type-Options: nosniff" -ForegroundColor Green
    Write-Host "  ✓ Referrer-Policy: strict-origin-when-cross-origin" -ForegroundColor Green
    Write-Host "  ✓ Permissions-Policy: Restricted dangerous features" -ForegroundColor Green
    Write-Host "  ✓ Cross-Origin-Embedder-Policy: require-corp" -ForegroundColor Green
    Write-Host "  ✓ Cross-Origin-Opener-Policy: same-origin" -ForegroundColor Green
    Write-Host "  ✓ Cross-Origin-Resource-Policy: same-origin" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Test your security headers at:" -ForegroundColor Cyan
    Write-Host "  https://securityheaders.com/?q=https://cropify-8e68d.web.app/" -ForegroundColor Yellow
    Write-Host "  https://observatory.mozilla.org/analyze/cropify-8e68d.web.app" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📚 Documentation: SECURITY_HEADERS.md" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deployment failed. Please check the errors above." -ForegroundColor Red
    exit 1
}


