# Android Build Environments

This guide explains how to build the Android app for different environments (local development vs production server).

## Environment Configuration

The app supports two main environments:

1. **Local Development** - Connects to your local backend server
2. **Production Server** - Connects to the VPS server at `107.175.91.211:3000`

## Quick Start

### Local Development Build

For development builds that connect to your local backend:

```bash
# Option 1: Use npm script (recommended)
npm run android:local

# Option 2: Set environment variable manually
EXPO_PUBLIC_API_URL=http://localhost:3000 npm run android

# Option 3: Use .env.local file
cp .env.local .env
npm run android
```

**Note**: For Android physical devices, make sure to run:
```bash
adb reverse tcp:3000 tcp:3000
```

### Production Server Build

For production builds that connect to the VPS server:

```bash
# Option 1: Use npm script (recommended)
npm run android:server

# Option 2: Set environment variable manually
EXPO_PUBLIC_API_URL=http://107.175.91.211:3000 npm run android

# Option 3: Use .env.server file
cp .env.server .env
npm run android
```

## Prebuild Commands

If you need to prebuild the native Android project:

### Local Development Prebuild
```bash
npm run android:prebuild:local
```

### Production Server Prebuild
```bash
npm run android:prebuild:server
```

## Environment Files

The project includes several environment files:

- `.env` - Active environment file (gitignored)
- `.env.local` - Template for local development
- `.env.server` - Template for production server
- `.env.example` - Example with all options

### Setting Up Environment File

1. **For Local Development:**
   ```bash
   cp .env.local .env
   ```

2. **For Production Server:**
   ```bash
   cp .env.server .env
   ```

3. **Custom Configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

## API URL Configuration Priority

The app determines the API URL in this order:

1. **`EXPO_PUBLIC_API_URL` environment variable** (highest priority)
   - Set via `.env` file or command line
   - Example: `EXPO_PUBLIC_API_URL=http://localhost:3000`

2. **`app.config.js` extra.apiUrl**
   - Configured in `app.config.js` based on `NODE_ENV`

3. **Default values**
   - Development: `http://localhost:3000`
   - Production: `http://107.175.91.211:3000`

## Common Scenarios

### Android Emulator (Local Development)
```bash
# Update .env with:
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# Then build:
npm run android
```

### Android Physical Device (Local Development)
```bash
# Option 1: USB port forwarding (recommended)
adb reverse tcp:3000 tcp:3000
# Update .env with:
EXPO_PUBLIC_API_URL=http://localhost:3000

# Option 2: Network IP
# Find your computer's IP: ifconfig | grep "inet " | grep -v 127.0.0.1
# Update .env with:
EXPO_PUBLIC_API_URL=http://192.168.0.102:3000  # Replace with your IP

# Then build:
npm run android
```

### Production Build
```bash
# Update .env with:
EXPO_PUBLIC_API_URL=http://107.175.91.211:3000

# Then build:
npm run android:server
```

## Verifying Configuration

After building, check the app logs to verify the API URL:

```bash
# Android logs
adb logcat | grep -i "API.*Configuration"

# Or check Metro bundler console output
# Look for: [API] Configuration: { baseUrl: ..., environment: ... }
```

## Troubleshooting

### App connects to wrong server
- Check your `.env` file exists and has the correct `EXPO_PUBLIC_API_URL`
- Verify the environment variable is set: `echo $EXPO_PUBLIC_API_URL`
- Rebuild the app after changing `.env` file

### Android device can't reach localhost
- Use USB port forwarding: `adb reverse tcp:3000 tcp:3000`
- Or use your computer's network IP address instead of `localhost`

### Environment variable not working
- Make sure `.env` file is in the `mobile-expo/` directory
- Restart Metro bundler after changing `.env`
- Rebuild native app if using prebuild

## Build Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run android` | Build for Android (uses current `.env` or defaults) |
| `npm run android:local` | Build for local development |
| `npm run android:server` | Build for production server |
| `npm run android:prebuild` | Prebuild native Android project |
| `npm run android:prebuild:local` | Prebuild for local development |
| `npm run android:prebuild:server` | Prebuild for production server |
