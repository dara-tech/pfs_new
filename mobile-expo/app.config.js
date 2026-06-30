import 'dotenv/config';

// Get API URL from environment variable or use defaults
// This value is baked into the app at build time via Constants.expoConfig.extra.apiUrl
const getApiUrl = () => {
  const PRODUCTION_URL = 'http://107.175.91.211:3000';
  const LOCALHOST_URL = 'http://localhost:3000';
  
  // Check if this is a production build (release APK)
  // For release builds, we want to use production server
  const isProduction = process.env.NODE_ENV === 'production' || 
                        process.env.EAS_BUILD_PROFILE === 'production' ||
                        process.env.EXPO_PUBLIC_ENV === 'production';
  
  // Always use environment variable if set (highest priority)
  // This allows you to override for different build types
  if (process.env.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    // CRITICAL: Always override localhost to production (even in dev mode)
    // This prevents localhost issues when running on physical devices
    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      console.log('[app.config] ⚠️ Localhost detected in env, overriding to production URL');
      return PRODUCTION_URL;
    }
    // If env URL is already production, use it
    if (envUrl.includes('107.175.91.211')) {
      console.log('[app.config] Using production URL from env:', envUrl);
      return envUrl;
    }
    // Otherwise use env URL as-is
    console.log('[app.config] Using env URL:', envUrl);
    return envUrl;
  }
  
  // For production builds, ALWAYS use production server (safety fallback)
  if (isProduction) {
    console.log('[app.config] Production build detected (NODE_ENV=production), using production URL');
    return PRODUCTION_URL;
  }
  
  // Default to production URL for release APKs (safety)
  // This ensures release APKs always work even if env var is missing
  // For development, set EXPO_PUBLIC_API_URL=http://localhost:3000 in .env
  console.log('[app.config] Using production URL as default (set EXPO_PUBLIC_API_URL for dev)');
  return PRODUCTION_URL;
};

export default {
  expo: {
    name: 'PSF Mobile',
    slug: 'psf-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/logo.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.psfmobile'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/logo.png',
        backgroundColor: '#ffffff'
      },
      edgeToEdgeEnabled: true,
      package: 'com.anonymous.psfmobile',
      versionCode: 1,
      // Allow cleartext HTTP traffic (required for http://107.175.91.211:3000)
      usesCleartextTraffic: true
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: [
      'expo-font',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera to scan QR codes.'
        }
      ]
    ],
    extra: {
      // Expose API URL to the app
      apiUrl: getApiUrl(),
      // Set environment based on NODE_ENV or default to development
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      // You can add more environment-specific config here
    }
  }
};
