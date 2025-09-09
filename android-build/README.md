# PALL NETWORK - Android Studio Project

## 📱 Project Overview
Complete Android Studio project for PALL NETWORK crypto mining simulation app with Firebase integration and WebView wrapper.

## 🚀 Quick Start

### Android Studio Setup
1. **Open Project**: Import the `android` folder in Android Studio
2. **Sync Gradle**: Wait for "Sync Project with Gradle Files" to complete
3. **Build APK**: Go to Build → Build Bundle(s) / APK(s) → Build APK(s)
4. **Generate AAB**: Go to Build → Generate Signed Bundle / APK → Android App Bundle

### Firebase Configuration
- ✅ `google-services.json` already included in `app/` folder
- ✅ Firebase Auth and Firestore dependencies configured
- ✅ Package name: `com.pallnetwork`

### iOS Setup (Expo/Xcode)
1. Use the `ios` folder for iOS builds
2. `Info.plist` configured with proper permissions
3. `GoogleService-Info.plist` included for Firebase

## 📋 Features Included

### ✅ Android Features
- **WebView Integration**: Loads https://pallnetworkcommerce.com
- **Firebase Auth**: User authentication with Google sign-in
- **Firebase Firestore**: Real-time database for mining data
- **Push Notifications**: Mining completion alerts
- **Deep Links**: `pallnetwork://` and `https://pallnetworkcommerce.com`
- **Splash Screen**: Branded loading screen
- **Security**: Network security config, proguard rules
- **Icons**: Pall Network elephant logo for all densities

### ✅ iOS Features
- **WebView Wrapper**: Native iOS app with web content
- **Firebase Integration**: Auth and Firestore configured
- **App Transport Security**: HTTPS enforcement
- **Deep Links**: Custom URL scheme support
- **Camera Permissions**: For QR code wallet scanning

## 🔧 Build Configuration

### Gradle Build System
- **Min SDK**: Android 7.0 (API 24)
- **Target SDK**: Android 14 (API 34)
- **Build Tools**: 34.0.0
- **Kotlin**: 1.9.10
- **Gradle**: 8.1.2

### Dependencies
- Firebase BOM 32.7.0
- AndroidX libraries
- WebView components
- Material Design 3

## 📦 Build Commands

### Debug Build
```bash
./gradlew assembleDebug
```

### Release Build (APK)
```bash
./gradlew assembleRelease
```

### Release Bundle (AAB)
```bash
./gradlew bundleRelease
```

## 🏗️ Project Structure
```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/pallnetwork/
│   │   │   ├── MainActivity.kt
│   │   │   ├── SplashActivity.kt
│   │   │   └── FirebaseMessagingService.kt
│   │   ├── res/
│   │   │   ├── layout/ (UI layouts)
│   │   │   ├── values/ (strings, colors, styles)
│   │   │   ├── mipmap-*/ (app icons)
│   │   │   └── xml/ (security configs)
│   │   └── AndroidManifest.xml
│   ├── build.gradle (app module)
│   ├── google-services.json (Firebase config)
│   └── proguard-rules.pro
├── build.gradle (project level)
├── settings.gradle
└── gradle/ (wrapper files)

ios/
├── Info.plist (iOS configuration)
└── GoogleService-Info.plist (Firebase iOS)
```

## 🛡️ Security Features
- **Network Security**: HTTPS enforcement
- **Firebase Rules**: Secure data access
- **ProGuard**: Code obfuscation for release
- **Permissions**: Minimal required permissions

## 📱 App Store Compliance
- **Privacy Policy**: Linked in web app
- **Terms of Service**: Available in policies page
- **Age Rating**: Educational content
- **Permissions**: Camera (optional), Internet

## 🚨 Important Notes
1. **Package Name**: Must match Firebase project (`com.pallnetwork`)
2. **Signing**: Configure release keystore for production
3. **Firebase**: Ensure web app domain is in Firebase Auth authorized domains
4. **Testing**: Test on real devices for WebView functionality

## 📞 Support
For technical issues with the Android build, check:
- Gradle sync errors
- Firebase configuration
- WebView permissions
- Network connectivity

---
**Built for**: PALL NETWORK Crypto Mining Simulation  
**Platform**: Android Studio 2023.1+  
**Target**: Google Play Store + Sideloading