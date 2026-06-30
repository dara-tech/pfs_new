import React, { useEffect, useRef } from 'react';
import { StatusBar, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, configureFonts } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';
import AppNavigator from './navigation/AppNavigator';
import { useAppStore } from './store/useAppStore';
import { syncOfflineQueue } from './utils/offlineStorage';
import { questionnaireAPI } from './services/api';
import { colors, fontFamily } from './src/theme';

// Configure fonts for React Native Paper - Using Kantumruy Pro
const defaultFont = fontFamily.default || 'System';
const fontConfig = {
  web: {
    regular: {
      fontFamily: defaultFont,
      fontWeight: '400',
    },
    medium: {
      fontFamily: defaultFont,
      fontWeight: '500',
    },
    bold: {
      fontFamily: defaultFont,
      fontWeight: '700',
    },
  },
  ios: {
    regular: {
      fontFamily: defaultFont,
      fontWeight: '400',
    },
    medium: {
      fontFamily: defaultFont,
      fontWeight: '500',
    },
    bold: {
      fontFamily: defaultFont,
      fontWeight: '700',
    },
  },
  android: {
    regular: {
      fontFamily: defaultFont,
      fontWeight: '400',
    },
    medium: {
      fontFamily: defaultFont,
      fontWeight: '500',
    },
    bold: {
      fontFamily: defaultFont,
      fontWeight: '700',
    },
  },
};

const lightTheme = {
  colors: {
    primary: colors.primary.light,
    background: colors.background.light,
    surface: colors.card.light,
    text: colors.text.primary.light,
    onSurface: colors.text.primary.light,
    onBackground: colors.text.primary.light,
    outline: colors.border.light,
  },
  fonts: configureFonts({ config: fontConfig }),
};

export default function App() {
  const { init, locale } = useAppStore();
  const wasOfflineRef = useRef(false);

  // Sync function
  const syncQueue = async () => {
    console.log('[App] 🔄 syncQueue called');
    try {
      const result = await syncOfflineQueue(async (item) => {
        console.log('[App] Processing sync item:', { type: item.type, token: item.token, index: item.index });
        if (item.type === 'client') {
          await questionnaireAPI.saveClientPage(item.token, item.index, item.data);
        } else if (item.type === 'provider') {
          await questionnaireAPI.saveProviderPage(item.token, item.index, item.data);
        }
      });
      
      console.log('[App] Sync result:', result);
      
      if (result.synced > 0) {
        console.log(`[App] ✅ Synced ${result.synced} items from offline queue`);
      }
      if (result.removed > 0) {
        console.log(`[App] 🗑️ Removed ${result.removed} invalid/expired items from queue`);
      }
      if (result.failed > 0) {
        console.warn(`[App] ⚠️ Failed to sync ${result.failed} items (will retry later)`);
      }
      
      return result;
    } catch (error) {
      console.error('[App] Error syncing offline queue:', error);
      return { synced: 0, failed: 0, removed: 0 };
    }
  };

  useEffect(() => {
    // Initialize app store
    init();
    
    // Sync offline queue when app starts
    syncQueue();
  }, [init]);

  // Monitor network status and sync when connection is restored
  useEffect(() => {
    // Check initial network status
    NetInfo.fetch().then(state => {
      wasOfflineRef.current = !state.isConnected;
    });

    // Listen for network status changes
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const isConnected = state.isConnected;
      const wasOffline = wasOfflineRef.current;
      
      // If we were offline and now we're online, trigger sync
      if (wasOffline && isConnected) {
        console.log('[App] 🌐 Network connection restored - syncing offline queue...');
        await syncQueue();
      }
      
      // Update the ref
      wasOfflineRef.current = !isConnected;
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <PaperProvider theme={lightTheme}>
          <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />
          <AppNavigator />
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
