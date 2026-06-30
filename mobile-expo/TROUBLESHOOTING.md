# Troubleshooting "Unable to Load Script" Error

## Quick Fix Steps

### 1. Ensure Port Forwarding is Active
```bash
adb reverse tcp:8081 tcp:8081
```

### 2. Restart Metro Bundler
```bash
cd mobile-expo
npx expo start --dev-client --clear
```

### 3. Restart App on Device
```bash
adb -s HVA5K72A shell am force-stop com.anonymous.psfmobile
adb -s HVA5K72A shell am start -n com.anonymous.psfmobile/.MainActivity
```

## Alternative Solutions

### Option A: Use LAN Mode (Recommended for Physical Device)
```bash
npx expo start --dev-client --lan
```
This uses your network IP (192.168.1.116) to connect.

### Option B: Use Tunnel Mode
```bash
npx expo start --dev-client --tunnel
```
This creates a tunnel through Expo's servers (slower but works from anywhere).

### Option C: Manual Connection
1. Start Metro: `npx expo start --dev-client`
2. Note the URL shown (e.g., `exp://192.168.1.116:8081`)
3. Shake device → "Enter URL manually"
4. Enter the URL

## Check Connection

### Verify Device Can Reach Metro
```bash
# On your tablet, open browser and go to:
http://192.168.1.116:8081
```

If this doesn't load, check:
- Both devices on same WiFi network
- Firewall not blocking port 8081
- Backend server running on port 3000

## Common Issues

### Issue: "Metro bundler not responding"
**Solution**: Restart Metro with `--clear` flag

### Issue: "Network request failed"
**Solution**: Use `--lan` mode or check WiFi connection

### Issue: "Script not found"
**Solution**: Clear Metro cache and rebuild:
```bash
npx expo start --dev-client --clear
```

## Current Configuration

- **Device**: HVA5K72A (TB350XU - 14)
- **Computer IP**: 192.168.1.116
- **Metro Port**: 8081
- **Backend API**: http://192.168.1.116:3000

## Still Not Working?

1. Check Metro bundler is running (should show QR code in terminal)
2. Verify device and computer on same network
3. Try tunnel mode: `npx expo start --dev-client --tunnel`
4. Check device logs: `adb -s HVA5K72A logcat | grep -i "react\|metro\|expo"`
