# Firebase App Distribution Setup Guide

## 📱 What is Firebase App Distribution?

Firebase App Distribution is a service that makes it easy to distribute your mobile app to testers. It provides:
- Email notifications to testers when new versions are available
- Version management and tracking
- Release notes for each version
- Analytics on who installed what version
- Secure distribution to specific testers

---

## 🚀 Setup Steps

### Step 1: Enable App Distribution in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **Cropify**
3. In the left sidebar, click on **App Distribution** (under Release & Monitor)
4. Click **Get Started** if you haven't enabled it yet

### Step 2: Register Your Android App

1. In Firebase Console, click on **Project Settings** (gear icon)
2. Under "Your apps", click **Add app** → **Android**
3. Register your Android app:
   - **Android package name**: `com.cropify.app` (or your actual package name)
   - **App nickname**: Cropify Mobile
   - Download the `google-services.json` file (you'll need this for your Android project)
4. Copy your **App ID** (it looks like `1:123456789:android:abc123def456`)

### Step 3: Update Configuration Files

#### 3.1 Update `package.json`

Replace `YOUR_ANDROID_APP_ID` in the `deploy:apk` script with your actual Android App ID:

```json
"deploy:apk": "firebase appdistribution:distribute public/downloads/cropify.apk --app 1:123456789:android:abc123def456 --release-notes-file release-notes.txt --testers-file testers.txt"
```

#### 3.2 Update `firebase.json`

The file should already include hosting configuration. You can optionally add App Distribution settings:

```json
{
  "hosting": {
    // ... existing hosting config
  },
  "appDistribution": {
    "serviceCredentialsFile": "service-account.json"
  }
}
```

### Step 4: Create Configuration Files

#### 4.1 Create `testers.txt`

Create a file listing your testers' email addresses (one per line):

```
john.doe@example.com
jane.smith@example.com
tester@cropify.com
```

#### 4.2 Create `release-notes.txt`

Create a file with release notes for your APK:

```
Version 1.0.0 - Initial Release

New Features:
- User authentication with MFA
- Plant disease detection
- Sensor data monitoring
- Real-time analytics dashboard

Bug Fixes:
- None (initial release)
```

### Step 5: Authenticate Firebase CLI

```bash
# Login to Firebase (if not already logged in)
firebase login

# Make sure you're using the correct project
firebase use cropify-8e68d
```

### Step 6: Deploy Your APK

#### Option A: Using npm script
```bash
npm run deploy:apk
```

#### Option B: Using Firebase CLI directly
```bash
firebase appdistribution:distribute public/downloads/cropify.apk \
  --app 1:123456789:android:abc123def456 \
  --release-notes "Your release notes here" \
  --testers "email1@example.com,email2@example.com"
```

#### Option C: Using PowerShell Script
Run the included `deploy-app-distribution.ps1` script:
```powershell
.\deploy-app-distribution.ps1
```

---

## 📋 Advanced Configuration

### Add Tester Groups

Instead of individual testers, you can create groups in Firebase Console:

1. Go to Firebase Console → App Distribution
2. Click on **Testers & Groups** tab
3. Create a group (e.g., "QA Team", "Beta Testers")
4. Add testers to the group

Then use the `--groups` flag:
```bash
firebase appdistribution:distribute public/downloads/cropify.apk \
  --app YOUR_APP_ID \
  --groups "qa-team,beta-testers"
```

### Service Account Authentication (CI/CD)

For automated deployments (GitHub Actions, etc.), use a service account:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **IAM & Admin** → **Service Accounts**
4. Create a new service account with role: **Firebase App Distribution Admin**
5. Create and download a JSON key
6. Save as `service-account.json` (add to `.gitignore`!)

Update your command:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
firebase appdistribution:distribute public/downloads/cropify.apk \
  --app YOUR_APP_ID \
  --release-notes-file release-notes.txt
```

---

## 🔧 PowerShell Script

The included `deploy-app-distribution.ps1` script automates the entire process:

```powershell
# Edit the script to add your App ID
$APP_ID = "1:123456789:android:abc123def456"

# Run the script
.\deploy-app-distribution.ps1
```

---

## 📝 Testers Will Receive

When you deploy, testers will receive:
1. **Email notification** with download link
2. **Release notes** you provided
3. Link to install via Firebase App Tester app or direct APK download

---

## 🔍 Monitoring

After deployment, you can monitor:
- **Number of installations** per version
- **Active testers** and their devices
- **Crash reports** (if Firebase Crashlytics is integrated)
- **Feedback** from testers

---

## 🚨 Troubleshooting

### Error: "App ID not found"
- Make sure you've registered your Android app in Firebase Console
- Verify the App ID format: `1:PROJECT_NUMBER:android:APP_HASH`

### Error: "Permission denied"
- Run `firebase login` to authenticate
- Make sure your account has "Firebase App Distribution Admin" role

### Error: "APK file not found"
- Verify the path to your APK file
- Default path: `public/downloads/cropify.apk`

### Testers not receiving emails
- Check spam/junk folders
- Verify tester emails are correct
- Check Firebase Console → App Distribution → Testers & Groups

---

## 📚 Additional Resources

- [Firebase App Distribution Documentation](https://firebase.google.com/docs/app-distribution)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Automate App Distribution with CI/CD](https://firebase.google.com/docs/app-distribution/android/distribute-console)

---

## ✅ Quick Start Checklist

- [ ] Enable App Distribution in Firebase Console
- [ ] Register Android app and get App ID
- [ ] Update `package.json` with your App ID
- [ ] Create `testers.txt` with tester emails
- [ ] Create `release-notes.txt` with version info
- [ ] Run `firebase login`
- [ ] Run `npm run deploy:apk` or use PowerShell script
- [ ] Verify testers received email notifications

---

**Need help?** Check the Firebase Console for detailed logs and error messages.

