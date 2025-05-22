# 🔥 Firebase Setup Instructions

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Name it "Study Dashboard" 
4. Enable Google Analytics (recommended)
5. Click "Create project"

## 2. Enable Firestore Database

1. In your Firebase project, go to **Build > Firestore Database**
2. Click "Create database"
3. Select **Start in test mode** (we'll change this later)
4. Choose a location (pick closest to your users)
5. Click "Done"

## 3. Enable Authentication

1. Go to **Build > Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable:
   - **Email/Password** (click enable)
   - **Google** (click enable, add your project's OAuth support email)
   - **Anonymous** (click enable)

## 4. Get Firebase Configuration

1. Go to **Project settings** (gear icon)
2. Scroll down to "Your apps"
3. Click **Web** icon `</>`
4. Register app with nickname "Study Dashboard"
5. **Copy the config object**

## 5. Update Environment Variables

Replace the values in `.env.local` with your actual Firebase config:

```bash
# Firebase Configuration - Replace with your values
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=study-dashboard-12345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=study-dashboard-12345
VITE_FIREBASE_STORAGE_BUCKET=study-dashboard-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 6. Deploy Firestore Security Rules

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init firestore`
4. Choose your project
5. Accept defaults for rules file
6. Deploy rules: `firebase deploy --only firestore:rules`

Or manually copy the rules from `firestore.rules` into the Firestore Rules tab in the console.

## 7. Test the Integration

1. Start the dev server: `pnpm run dev`
2. The app should show a login screen
3. Try signing in with Google or as a guest
4. Create some courses and see them sync in real-time
5. Check the Firestore console to see your data

## 🔒 Security Rules

The `firestore.rules` file ensures:
- Users can only access their own data
- Anonymous users get their own isolated data space
- All reads/writes require authentication

## 📱 Features Now Available

✅ **Real-time sync** between devices  
✅ **Offline-first** - works without internet  
✅ **Automatic backup** to cloud  
✅ **Guest mode** - no registration required  
✅ **Google Sign-in** - easy authentication  
✅ **Data migration** - imports existing localStorage data  

## 🛠️ Troubleshooting

### Issue: "Firebase App named '[DEFAULT]' already exists"
- Clear browser cache and reload

### Issue: "Missing or insufficient permissions" 
- Check that Firestore rules are deployed correctly
- Make sure you're authenticated

### Issue: "Network request failed"
- Check your Firebase config values
- Verify project ID matches

### Issue: Data not syncing
- Check browser developer console for errors
- Verify internet connection
- Look for the sync indicator in top-left corner

## 🚀 Ready to Go!

Your Study Dashboard now has full cloud integration! 🎉