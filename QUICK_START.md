# 🚀 Quick Start Guide - Firebase App Distribution

## Prerequisites Checklist

- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] APK file ready at `public/downloads/cropify.apk`
- [ ] Android app registered in Firebase Console

---

## 🎯 Step-by-Step Setup (5 Minutes)

### 1️⃣ Get Your Android App ID

```powershell
# Open Firebase Console
start https://console.firebase.google.com/project/cropify-8e68d/settings/general
```

- Scroll to "Your apps"
- If no Android app exists, click **Add app** → **Android**
  - Package name: `com.cropify.app`
  - App nickname: `Cropify Mobile`
- Copy the **App ID** (looks like: `1:123456789:android:abc123def456`)

### 2️⃣ Configure Deployment Script

Open `deploy-app-distribution.ps1` and update line 7:

```powershell
# Change this:
$APP_ID = "YOUR_ANDROID_APP_ID"

# To your actual App ID:
$APP_ID = "1:123456789:android:abc123def456"
```

### 3️⃣ Add Testers

Edit `testers.txt` and add email addresses (one per line):

```
your.email@example.com
teammate@cropify.com
```

### 4️⃣ Update Release Notes

Edit `release-notes.txt` with your version info:

```
Version 1.0.0 - Initial Release

New Features:
- Feature 1
- Feature 2
```

### 5️⃣ Deploy!

```powershell
# Run the automated deployment script
.\deploy-app-distribution.ps1
```

### 6️⃣ Get Your Invite Link

After successful deployment:

1. Go to: https://console.firebase.google.com/project/cropify-8e68d/appdistribution
2. Click on your latest release
3. Click **"Invite Link"** button
4. Copy the link (format: `https://appdistribution.firebase.dev/i/XXXXXX`)

### 7️⃣ Update Landing Page

Open `src/pages/Landing/LandingPage.jsx` and find line 274:

```javascript
// Replace YOUR_DISTRIBUTION_ID with your actual ID
href="https://appdistribution.firebase.dev/i/YOUR_DISTRIBUTION_ID"

// Example:
href="https://appdistribution.firebase.dev/i/abc123xyz789"
```

### 8️⃣ Deploy Landing Page

```powershell
npm run build
firebase deploy --only hosting
```

---

## ✅ Verification

### Test Direct Download:
```
https://cropify-8e68d.web.app/downloads/cropify.apk
```

### Test Beta Link:
```
https://appdistribution.firebase.dev/i/YOUR_ID
```

---

## 🎉 You're Done!

Your app is now available via:
- ✅ Direct APK download (Firebase Hosting)
- ✅ Beta testing program (Firebase App Distribution)

---

## 📞 Need Help?

**Common Issues:**

1. **"Firebase command not found"**
   ```powershell
   npm install -g firebase-tools
   ```

2. **"Not authenticated"**
   ```powershell
   firebase login
   ```

3. **"App ID not found"**
   - Check Firebase Console → Project Settings → Your apps
   - Make sure Android app is registered

4. **"Permission denied"**
   - Your Firebase account needs "Editor" or "Owner" role
   - Check IAM settings in Firebase Console

---

## 📚 Full Documentation

- [FIREBASE_APP_DISTRIBUTION_SETUP.md](./FIREBASE_APP_DISTRIBUTION_SETUP.md) - Complete setup guide
- [FIREBASE_APP_DISTRIBUTION_LANDING_PAGE.md](./FIREBASE_APP_DISTRIBUTION_LANDING_PAGE.md) - Landing page integration
- [release-notes.txt](./release-notes.txt) - Release notes template
- [testers.txt](./testers.txt) - Testers list

---

**Happy distributing! 🚀**

