# Network Troubleshooting: Tablet Can't Reach Backend

## Problem
Tablet cannot access `http://192.168.0.102:3000/api/health` from browser.

## Solutions

### Solution 1: Check WiFi Networks (Most Common)
1. **On your tablet**: Go to Settings → WiFi
2. **On your computer**: Check WiFi network name
3. **Verify**: Both devices are connected to the **exact same WiFi network**
   - Same network name (SSID)
   - Not on guest network
   - Not on 5GHz vs 2.4GHz (some routers separate these)

### Solution 2: Disable Router AP Isolation
Some routers have "AP Isolation" or "Client Isolation" enabled, which prevents devices from talking to each other.

1. Access your router admin panel (usually `192.168.0.1` or `192.168.1.1`)
2. Look for:
   - "AP Isolation"
   - "Client Isolation" 
   - "Wireless Isolation"
   - "Station Isolation"
3. **Disable** this setting
4. Save and reconnect both devices

### Solution 3: Use USB Debugging with Port Forwarding (Android)
If your tablet is connected via USB:

```bash
# Forward port 3000 from tablet to computer
adb reverse tcp:3000 tcp:3000
```

Then update `.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Solution 4: Use ngrok (Works from Anywhere)
Create a public tunnel to your backend:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

This will give you a URL like: `https://abc123.ngrok.io`
Update `.env`:
```env
EXPO_PUBLIC_API_URL=https://abc123.ngrok.io
```

### Solution 5: Check Firewall (macOS)
Even though firewall is disabled, verify:

```bash
# Check firewall status
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If enabled, allow Node.js
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

### Solution 6: Verify IP Address
Your tablet might be on a different subnet. Check:

**On tablet**: Go to WiFi settings → Tap your network → Check "Gateway" or "Router" IP
- If router is `192.168.1.1`, your computer should be `192.168.1.x`
- If router is `192.168.0.1`, your computer should be `192.168.0.x`

**On computer**: 
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Update `.env` with the correct IP if different.

### Solution 7: Test with Ping
From your tablet's terminal (if available) or use a network scanner app:
- Try to ping `192.168.0.102`
- If ping fails, it's a network connectivity issue

## Quick Test
1. On tablet browser, try: `http://192.168.0.1` (router admin)
2. If that works but `192.168.0.102:3000` doesn't, it's likely AP isolation
3. If router admin doesn't work, you're on a different network

## Recommended: Use USB + Port Forwarding
For development, the easiest solution is USB debugging:

```bash
# Connect tablet via USB
# Enable USB debugging on tablet
adb devices  # Verify device is connected
adb reverse tcp:3000 tcp:3000  # Forward port

# Update .env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

This bypasses all network issues!
