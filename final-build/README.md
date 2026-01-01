# PALL NETWORK - Complete Mobile & Web Build Package

## 📱 Project Overview
Complete build package for PALL NETWORK crypto mining simulation app with cross-platform deployment support.

## 🚀 Quick Start Guide

### 🌐 Web Deployment
1. **Install Dependencies**: `npm install`
2. **Build**: `npm run build`
3. **Deploy**: Upload `dist/` folder to your hosting provider
4. **Live URL**: https://pallnetworkcommerce.com

### 🤖 Android Build (Gradle)
1. **Open Android Studio**
2. **Import Project**: Open the `android/` folder
3. **Sync Gradle**: Wait for "Sync Project with Gradle Files" to complete
4. **Add Firebase Config**: 
   - Replace `android/app/google-services.json` with your Firebase Android config
5. **Build APK**: Build → Build Bundle(s) / APK(s) → Build APK(s)
6. **Generate AAB**: Build → Generate Signed Bundle / APK → Android App Bundle

### 🍎 iOS Build (Expo EAS / Xcode)
1. **Install Expo CLI**: `npm install -g @expo/cli eas-cli`
2. **Navigate to iOS folder**: `cd ios/`
3. **Install Dependencies**: `npm install`
4. **Add Firebase Config**: 
   - Replace `ios/GoogleService-Info.plist` with your Firebase iOS config
5. **Build for Simulator**: `expo run:ios`
6. **Build for App Store**: `eas build --platform ios`

## 📦 Package Contents

```
├── web/                     # Complete React web application source
├── android/                # Android Studio Gradle project
├── ios/                    # iOS Expo/React Native project
├── server/                # Express.js backend (optional)
└── shared/                # Shared TypeScript types
```

## ⚙️ Configuration

### 🔥 Firebase Setup
1. **Android**: Replace `android/app/google-services.json` with your config
2. **iOS**: Replace `ios/GoogleService-Info.plist` with your config
3. **Web**: Update `web/src/lib/firebase.ts` with your web config

### 🎨 Branding
- **App Icons**: Located in `android/app/src/main/res/mipmap-*/` and `ios/assets/`
- **Package Names**: `com.pallnetwork` for both platforms

## ✨ Features

### 💎 Mining System
- **Rate**: Exactly 1 PALL token per 24 hours
- **Real-time**: Balance updates every second during mining
- **Persistence**: All data stored in Firebase Firestore

### 🔐 Authentication & Wallet
- **Firebase Auth**: Email/password authentication
- **Wallet Integration**: MetaMask, Trust Wallet support
- **USDT Payments**: BEP20 transaction processing

### 📱 Cross-Platform
- **Web**: Responsive design with dark/light mode
- **PWA**: Installable progressive web app
- **Android**: Native Android application
- **iOS**: Native iOS application via Expo

## 🛠️ Build Commands

### Web/PWA
```bash
npm install
npm run build
```

### Android
```bash
cd android/
./gradlew assembleRelease   # Release APK
./gradlew bundleRelease     # AAB for Play Store
```

### iOS
```bash
cd ios/
npm install
eas build --platform ios   # App Store build
```

---

**Built for**: Cross-platform deployment  
**Target**: Production app store distribution