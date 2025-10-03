# Deploy APK to Firebase Hosting
# This script downloads the APK from Google Drive and deploys it to Firebase Hosting

Write-Host "🚀 Starting APK deployment to Firebase Hosting..." -ForegroundColor Green

# Step 1: Download APK from Google Drive
Write-Host "📥 Downloading APK from Google Drive..." -ForegroundColor Yellow
$apkUrl = "https://drive.google.com/uc?export=download&id=1fOjfl4jJvvwMbVeeSTN5ojNVsui9ipbj"
$apkPath = "public\downloads\cropify.apk"

try {
    Invoke-WebRequest -Uri $apkUrl -OutFile $apkPath
    Write-Host "✅ APK downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download APK: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Build the project
Write-Host "🔨 Building the project..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✅ Project built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Copy APK to dist folder
Write-Host "📁 Copying APK to dist folder..." -ForegroundColor Yellow
try {
    if (!(Test-Path "dist\downloads")) {
        New-Item -ItemType Directory -Path "dist\downloads" -Force
    }
    Copy-Item $apkPath "dist\downloads\cropify.apk" -Force
    Write-Host "✅ APK copied to dist folder" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to copy APK: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Deploy to Firebase Hosting
Write-Host "🚀 Deploying to Firebase Hosting..." -ForegroundColor Yellow
try {
    firebase deploy --only hosting
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "🌐 Your APK is now available at: https://cropify-8e68d.web.app/downloads/cropify.apk" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 APK deployment completed successfully!" -ForegroundColor Green
