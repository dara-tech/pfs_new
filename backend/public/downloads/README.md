# APK Downloads Directory

This directory stores APK files for the mobile app that can be downloaded by Android users.

## How to Upload APK Files

1. **Build your Android APK** from the mobile-expo project:
   ```bash
   cd pfs_new/mobile-expo
   npm run android:server  # or android:local
   ```

2. **Locate the APK file**:
   - The APK will be generated in: `mobile-expo/android/app/build/outputs/apk/release/` or `mobile-expo/android/app/build/outputs/apk/debug/`
   - Look for a file named `app-release.apk` or `app-debug.apk`

3. **Copy the APK to this directory**:
   ```bash
   cp mobile-expo/android/app/build/outputs/apk/release/app-release.apk backend/public/downloads/psf-mobile.apk
   ```

   Or rename it with version info:
   ```bash
   cp mobile-expo/android/app/build/outputs/apk/release/app-release.apk backend/public/downloads/psf-mobile-v1.0.0.apk
   ```

4. **The app will automatically serve the latest APK**:
   - The API endpoint `/api/downloads/apk` will serve the most recently modified APK file
   - Android users visiting the web app will see a "Download APK" button

## File Naming

- You can name APK files anything you want (e.g., `psf-mobile.apk`, `psf-mobile-v1.0.0.apk`)
- The system will automatically serve the most recently modified APK file
- Multiple APK files can exist - the newest one will be served

## Security Note

- Only upload APK files that you trust
- APK files are served publicly, so anyone with the URL can download them
- Consider adding authentication if you want to restrict downloads
