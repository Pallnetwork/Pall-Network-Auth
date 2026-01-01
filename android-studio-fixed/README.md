# Pall Network - Android Studio Project

This is the complete Android Studio project for the Pall Network crypto mining simulation app.

## Recent Updates (September 15, 2025)
- ✅ **Package Name Updated**: Consistently set to `com.pallnetwork.auth` across all files
- ✅ **JDK 17 Support**: Updated to JDK 17 (compatible with AGP 8.1.2 and Kotlin 1.9.10)
- ✅ **gradle.properties Fixed**: Cross-platform compatible configuration without hardcoded JDK paths
- ✅ **Firebase Configuration**: Updated google-services.json to align with new package name
- ✅ **Source Files Refactored**: All Java/Kotlin files moved to correct package structure
- ✅ **Security Fixes**: WebView permission handling now properly verifies origins and requests Android permissions
- ✅ **Build Configuration**: Uses BuildConfig.WEB_APP_URL instead of hardcoded values
- ✅ **Cross-Platform Ready**: Removed Linux-specific JDK paths for better compatibility

## Package Structure
- **Package Name**: `com.pallnetwork.auth`
- **Application ID**: `com.pallnetwork.auth`
- **Firebase Config**: Aligned with package name

## JDK Requirements
- **JDK Version**: 17 (compatible with AGP 8.1.2)
- **Kotlin Target**: JVM 17
- **Java Compatibility**: VERSION_17

## Project Structure
- `app/` - Android application module
- `web-src/` - React frontend source code
- `server/` - Express.js backend
- `shared/` - Shared TypeScript schemas
- Configuration files for web development

## Android Studio Setup
1. Open Android Studio
2. Select "Open an Existing Project"
3. Navigate to this directory
4. Wait for Gradle sync to complete
5. Build APK: Build → Build Bundle(s)/APK(s) → Build APK(s)
6. Build AAB: Build → Build Bundle(s)/APK(s) → Build App Bundle(s)

## Features
- 🔐 Firebase Authentication & Firestore Database
- ⛏️ Crypto Mining Simulation (24-hour cycles)
- 👥 Multi-level Referral System
- 📱 Progressive Web App (PWA) Support
- 🌙 Dark/Light Mode Theme
- 📊 Real-time Dashboard & Analytics

## Build Requirements
- Android Studio Arctic Fox or newer
- JDK 19
- Android SDK 34
- Kotlin 1.9.10

---
**Pall Network** - Secure. Decentralized. Profitable.