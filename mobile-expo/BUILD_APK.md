# Building Android APK

This guide explains how to build an Android APK for the PSF Mobile app.

## Build Options

### Option 1: EAS Build (Recommended - Cloud Build)

EAS Build is Expo's cloud-based build service. It's the easiest way to build APKs without setting up Android Studio.

#### Prerequisites
- Expo account (free)
- EAS CLI installed (already installed)

#### Steps

1. **Login to EAS:**
   ```bash
   eas login
   ```

2. **Configure your project (if not already done):**
   ```bash
   eas build:configure
   ```

3. **Build APK for Production:**
   ```bash
   npm run build:android
   # or
   eas build --platform android --profile production
   ```

4. **Build APK for Preview/Testing:**
   ```bash
   npm run build:android:preview
   # or
   eas build --platform android --profile preview
   ```

5. **Download the APK:**
   - After the build completes, you'll get a download link
   - Or check your builds at: https://expo.dev/accounts/[your-account]/projects/psf-mobile/builds

#### Build Profiles

- **production**: Connects to `http://107.175.91.211:3000` (VPS server)
- **preview**: Connects to `http://107.175.91.211:3000` (VPS server) - for testing
- **development**: Connects to `http://localhost:3000` - requires development client

---

### Option 2: Local Build (Requires Android Studio)

If you have Android Studio installed, you can build locally.

#### Prerequisites
- Android Studio installed
- Android SDK configured
- Java JDK installed

#### Steps

1. **Prebuild native Android project:**
   ```bash
   # For production server
   npm run android:prebuild:server
   
   # For local development
   npm run android:prebuild:local
   ```

2. **Build APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **Find the APK:**
   - Location: `android/app/build/outputs/apk/release/app-release.apk`

#### Alternative: Build Debug APK
```bash
cd android
./gradlew assembleDebug
# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Environment Configuration

The build uses environment variables to determine which API server to connect to:

- **Production**: `EXPO_PUBLIC_API_URL=http://107.175.91.211:3000`
- **Local**: `EXPO_PUBLIC_API_URL=http://localhost:3000`

These are configured in:
- `eas.json` (for EAS builds)
- `.env` file (for local builds)

---

## Quick Start Commands

### EAS Build (Cloud)
```bash
# Login first
eas login

# Build production APK
npm run build:android

# Build preview APK
npm run build:android:preview
```

### Local Build
```bash
# Prebuild for production server
npm run android:prebuild:server

# Build APK
cd android && ./gradlew assembleRelease
```

---

## Troubleshooting

### EAS Build Issues
- Make sure you're logged in: `eas whoami`
- Check your Expo account has build credits (free tier available)
- Verify `eas.json` configuration is correct

### Local Build Issues
- Ensure Android Studio is installed and SDK is configured
- Check Java JDK is installed: `java -version`
- Verify Gradle is working: `cd android && ./gradlew --version`

### APK Installation Issues
- Enable "Install from Unknown Sources" on Android device
- For Android 8+: Enable "Install unknown apps" for your file manager
- Check if APK is signed (release builds need signing)

---

## Signing APK (Production)

For production releases, you need to sign your APK:

### Using EAS Build
EAS Build automatically signs your APK if you configure credentials:
```bash
eas credentials
```

### Local Signing
1. Generate a keystore:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure signing in `android/app/build.gradle`

---

## Next Steps

After building:
1. Test the APK on a physical device
2. Distribute to testers (preview build)
3. Upload to Google Play Store (production build)
