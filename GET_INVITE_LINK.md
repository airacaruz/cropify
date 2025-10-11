# 🔗 How to Get Your Firebase App Distribution Invite Link

## ❌ Problem
You're seeing: **"This invite link is no longer valid"**

## ✅ Solution
You need to **deploy your app first**, then generate the invite link.

---

## 🚀 Quick Fix - Deploy Your Android App

### Step 1: Make Sure Your APK is Ready

Check if you have your APK file:
```powershell
# Check if APK exists
Test-Path "public\downloads\cropify.apk"
```

If it returns `False`, you need to:
1. Build your Android app in Android Studio
2. Copy the APK to `public\downloads\cropify.apk`

### Step 2: Deploy to Firebase App Distribution

```powershell
# Run the deployment script (already configured with your App ID)
.\deploy-app-distribution.ps1
```

**What this does:**
- ✅ Validates Firebase CLI
- ✅ Checks APK file exists
- ✅ Uploads APK to Firebase App Distribution
- ✅ Sends email to testers (cropifyphilippines@gmail.com)
- ✅ Creates a release

### Step 3: Get Your Invite Link

After successful deployment:

#### Option A: From Firebase Console (Easiest)

1. Go to Firebase Console:
   ```
   https://console.firebase.google.com/project/cropify-8e68d/appdistribution
   ```

2. Click on your Android app: **cropify_final_mobile (android)**

3. You'll see your latest release - click on it

4. Look for the **"Invite Link"** button at the top

5. Click it and copy the link

6. It will look like:
   ```
   https://appdistribution.firebase.dev/i/abc123xyz789
   ```

#### Option B: Using Firebase CLI

```powershell
# List your releases
firebase appdistribution:distributions:list --app 1:781285242880:android:21b5a406778da098dcc0e5
```

### Step 4: Update Your Landing Page

Once you have your invite link (e.g., `https://appdistribution.firebase.dev/i/abc123xyz789`):

Open `src/pages/Landing/LandingPage.jsx` and update:

**Line 311** (iOS link):
```javascript
href="https://appdistribution.firebase.dev/i/YOUR_IOS_DISTRIBUTION_ID"
// Replace with your iOS invite link (after deploying iOS app)
```

**Line 352** (Android beta link):
```javascript
href="https://appdistribution.firebase.dev/i/YOUR_ANDROID_DISTRIBUTION_ID"
// Replace with: https://appdistribution.firebase.dev/i/abc123xyz789
```

### Step 5: Deploy Your Updated Website

```powershell
npm run build
firebase deploy --only hosting
```

---

## 📱 Complete Deployment Commands

### For Android:

```powershell
# 1. Deploy APK to App Distribution
.\deploy-app-distribution.ps1

# 2. Go to Firebase Console and copy invite link
start https://console.firebase.google.com/project/cropify-8e68d/appdistribution

# 3. Update landing page with the link

# 4. Deploy website
npm run build
firebase deploy --only hosting
```

### For iOS (when ready):

```powershell
# 1. Place IPA file
# Copy your IPA to: public\downloads\cropify.ipa

# 2. Deploy IPA to App Distribution
.\deploy-ios-distribution.ps1

# 3. Get invite link from Firebase Console

# 4. Update landing page with the link

# 5. Deploy website
npm run build
firebase deploy --only hosting
```

---

## 🎯 Alternative: Create Public Distribution Link

If you want a permanent link that doesn't require testers to sign up:

1. After deploying, go to Firebase Console
2. Click on your release
3. Click **"Invite Link"** 
4. Toggle **"Public link"** ON
5. Copy the public link
6. Use this link in your landing page

**Benefit:** Anyone with the link can download without entering email

**Downside:** No email collection, less tracking

---

## 🔍 Troubleshooting

### "Firebase command not found"
```powershell
npm install -g firebase-tools
```

### "Not authenticated"
```powershell
firebase login
```

### "APK not found"
Check path: `public\downloads\cropify.apk`
Make sure you've built your Android app

### "Permission denied"
Your Firebase account needs proper permissions:
1. Go to Firebase Console
2. Click gear icon → Users and permissions
3. Make sure you have "Editor" or "Owner" role

### "App not found"
Make sure you're using the correct App ID:
- Android: `1:781285242880:android:21b5a406778da098dcc0e5`
- iOS: `1:781285242880:ios:f49112cb95723c18dcc0e5`

---

## 📧 What Happens After Deployment?

1. **Testers receive email** with subject: "You've been invited to test Cropify"
2. Email contains:
   - App name and icon
   - Release notes
   - Download button
   - Link to install
3. **You get analytics**:
   - Who downloaded
   - Installation success rate
   - Device types
   - Crash reports

---

## 🎉 Quick Start (TL;DR)

```powershell
# 1. Deploy Android app
.\deploy-app-distribution.ps1

# 2. Open Firebase Console
start https://console.firebase.google.com/project/cropify-8e68d/appdistribution

# 3. Click on Android app → Latest release → Copy "Invite Link"

# 4. Update LandingPage.jsx line 352 with your invite link

# 5. Deploy website
npm run build
firebase deploy --only hosting

# Done! ✅
```

---

## 📸 Visual Guide

### Where to Find Invite Link in Firebase Console:

```
Firebase Console
└── App Distribution (left sidebar)
    └── Releases tab
        └── [Your latest release]
            └── [Invite Link button] ← Click here
                └── Copy the link that appears
```

---

## 💡 Pro Tip

Create different invite links for different tester groups:

1. **Public Beta** - Anyone can join
2. **QA Team** - Internal testers only
3. **VIP Users** - Early access users

Each link tracks separately in Firebase Console!

---

**Need Help?** 

If the deployment fails, check:
1. Firebase CLI is installed: `firebase --version`
2. You're logged in: `firebase login`
3. Using correct project: `firebase use cropify-8e68d`
4. APK file exists: `Test-Path "public\downloads\cropify.apk"`

---

**Ready?** Run: `.\deploy-app-distribution.ps1` 🚀

