# Deploy APK to Firebase App Distribution
# This script automates the deployment of your Android APK to Firebase App Distribution

Write-Host "🚀 Starting APK deployment to Firebase App Distribution..." -ForegroundColor Green

# Configuration - ANDROID APP
$APP_ID = "1:781285242880:android:21b5a406778da098dcc0e5"  # Your Android App ID
$APK_PATH = "public\downloads\cropify.apk"
$RELEASE_NOTES_FILE = "release-notes-android.txt"
$TESTERS_FILE = "testers.txt"

# Step 1: Verify Firebase CLI is installed
Write-Host "🔍 Checking Firebase CLI installation..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI version: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Step 2: Verify Firebase login
Write-Host "🔐 Checking Firebase authentication..." -ForegroundColor Yellow
try {
    firebase projects:list 2>&1 | Out-Null
    Write-Host "✅ Firebase authentication successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Not authenticated. Please run: firebase login" -ForegroundColor Red
    exit 1
}

# Step 3: Check if App ID is configured
if ($APP_ID -eq "YOUR_ANDROID_APP_ID") {
    Write-Host "❌ Please update the APP_ID in this script with your Firebase Android App ID" -ForegroundColor Red
    Write-Host "   You can find it in Firebase Console > Project Settings > Your apps" -ForegroundColor Yellow
    Write-Host "   Format: 1:123456789:android:abc123def456" -ForegroundColor Yellow
    exit 1
}

# Step 4: Verify APK file exists
Write-Host "📱 Checking for APK file..." -ForegroundColor Yellow
if (!(Test-Path $APK_PATH)) {
    Write-Host "❌ APK file not found at: $APK_PATH" -ForegroundColor Red
    Write-Host "   Please make sure the APK file exists at this location" -ForegroundColor Yellow
    exit 1
}
$apkSize = (Get-Item $APK_PATH).Length / 1MB
Write-Host "✅ APK file found (Size: $([math]::Round($apkSize, 2)) MB)" -ForegroundColor Green

# Step 5: Verify configuration files
Write-Host "📄 Checking configuration files..." -ForegroundColor Yellow

if (!(Test-Path $RELEASE_NOTES_FILE)) {
    Write-Host "⚠️  Release notes file not found. Creating default..." -ForegroundColor Yellow
    "Cropify Mobile App - New Version`n`nThis is a test build." | Out-File $RELEASE_NOTES_FILE -Encoding UTF8
}

if (!(Test-Path $TESTERS_FILE)) {
    Write-Host "⚠️  Testers file not found. You'll need to add testers manually in Firebase Console" -ForegroundColor Yellow
    $TESTERS_PARAM = ""
} else {
    $testersCount = (Get-Content $TESTERS_FILE | Where-Object { $_ -match '\S' -and $_ -notmatch '^#' }).Count
    if ($testersCount -eq 0) {
        Write-Host "⚠️  No testers found in testers.txt. You'll need to add testers manually in Firebase Console" -ForegroundColor Yellow
        $TESTERS_PARAM = ""
    } else {
        Write-Host "✅ Found $testersCount tester(s)" -ForegroundColor Green
        $TESTERS_PARAM = "--testers-file $TESTERS_FILE"
    }
}

# Step 6: Deploy to Firebase App Distribution
Write-Host "`n🚀 Deploying to Firebase App Distribution..." -ForegroundColor Yellow
Write-Host "   App ID: $APP_ID" -ForegroundColor Cyan
Write-Host "   APK: $APK_PATH" -ForegroundColor Cyan

try {
    $command = "firebase appdistribution:distribute $APK_PATH --app $APP_ID --release-notes-file $RELEASE_NOTES_FILE"
    
    if ($TESTERS_PARAM) {
        $command += " $TESTERS_PARAM"
    }
    
    Write-Host "   Executing: $command" -ForegroundColor Gray
    Invoke-Expression $command
    
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "`n📧 Testers will receive an email notification with the download link" -ForegroundColor Cyan
    Write-Host "🌐 You can manage releases at: https://console.firebase.google.com/project/cropify-8e68d/appdistribution" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n💡 Common solutions:" -ForegroundColor Yellow
    Write-Host "   1. Make sure you have App Distribution enabled in Firebase Console" -ForegroundColor Yellow
    Write-Host "   2. Verify your App ID is correct" -ForegroundColor Yellow
    Write-Host "   3. Check that you have proper permissions" -ForegroundColor Yellow
    Write-Host "   4. Try running: firebase login --reauth" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🎉 APK deployment completed successfully!" -ForegroundColor Green
Write-Host "`n📊 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Check Firebase Console for deployment status" -ForegroundColor White
Write-Host "   2. Monitor tester feedback and crash reports" -ForegroundColor White
Write-Host "   3. Update release notes for next version" -ForegroundColor White

