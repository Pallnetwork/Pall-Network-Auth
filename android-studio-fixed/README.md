# Pall Network - Android Studio Project

This is the complete Android Studio project for the Pall Network crypto mining simulation app.

## Recent Updates (September 15, 2025)
- ✅ **Package Name Updated**: Consistently set to `com.pallnetwork.auth` across all files
- ✅ **JDK 19 Support**: Updated to support JDK 19 with proper Gradle configuration
- ✅ **gradle.properties Added**: Missing gradle.properties file created with optimization settings
- ✅ **Firebase Configuration**: Updated google-services.json to align with new package name
- ✅ **Source Files Refactored**: All Java/Kotlin files moved to correct package structure
- ✅ **Build Configuration Fixed**: Gradle sync issues resolved

## Package Structure
- **Package Name**: `com.pallnetwork.auth`
- **Application ID**: `com.pallnetwork.auth`
- **Firebase Config**: Aligned with package name

## JDK Requirements
- **JDK Version**: 19 (configured in gradle.properties and build.gradle)
- **Kotlin Target**: JVM 19
- **Java Compatibility**: VERSION_19

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