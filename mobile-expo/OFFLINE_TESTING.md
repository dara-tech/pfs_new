# Testing Offline Functionality

## Methods to Test Offline Mode

### Method 1: Airplane Mode (Easiest)
1. **On Android Device:**
   - Swipe down from top to open quick settings
   - Tap "Airplane Mode" to enable it
   - This disables WiFi and mobile data
   - The app will show "Offline" status

2. **Test Steps:**
   - Open the app (should show "Offline" status)
   - Scan QR code or enter token manually
   - Fill out questionnaire forms
   - Submit - data should be saved to offline queue
   - Turn off Airplane Mode
   - Data should auto-sync when connection is restored

### Method 2: Turn Off WiFi/Data Only
1. **On Android Device:**
   - Go to Settings → Network & Internet
   - Turn off WiFi
   - Turn off Mobile Data
   - Keep USB connected for debugging

2. **Note:** With USB port forwarding (`adb reverse`), the device might still detect a connection. Use Airplane Mode for more reliable testing.

### Method 3: Stop Backend Server
1. **On your laptop:**
   ```bash
   # Stop the backend server (Ctrl+C or kill the process)
   # The app will show "Online" but API calls will fail
   ```

2. **Limitation:** This doesn't trigger true offline mode since `NetInfo` still sees WiFi/data connection. The app will show "Online" but API calls will fail.

### Method 4: Development Mode - Force Offline (Recommended for Testing)

**Easiest method when testing with localhost server:**

1. **Edit the code:**
   - Open `src/services/api.js`
   - Find `const FORCE_OFFLINE_MODE = false;`
   - Change to `const FORCE_OFFLINE_MODE = true;`
   - Also update in `src/utils/offlineStorage.js` (same variable)

2. **Reload the app:**
   - The app will show "Offline" status even though you're connected
   - All API calls will be treated as offline
   - Data will be saved to offline queue

3. **Test offline functionality:**
   - Fill out forms
   - Submit data (will go to offline queue)
   - Check console logs for offline queue activity

4. **Test sync:**
   - Change `FORCE_OFFLINE_MODE` back to `false`
   - Reload app
   - Data should auto-sync when app starts

**Note:** Remember to set it back to `false` when done testing!

## Current Offline Behavior

- **Status Indicator:** Shows "Online" or "Offline" at top of screen
- **Form Submission:** When offline, data is saved to local queue
- **Navigation:** Continues to next section even when offline
- **Auto-Sync:** When connection is restored, queued data syncs automatically
- **Form Data:** Saved locally and restored when returning to pages

## Testing Checklist

- [ ] Status shows "Offline" when WiFi/data is off
- [ ] Can fill out forms when offline
- [ ] Can navigate between sections when offline
- [ ] Form data persists when app is closed/reopened offline
- [ ] Data syncs automatically when connection is restored
- [ ] Status updates to "Online" when connection restored
- [ ] Offline queue is cleared after successful sync
