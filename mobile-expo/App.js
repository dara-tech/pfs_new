import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, configureFonts, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  KantumruyPro_400Regular,
  KantumruyPro_500Medium,
  KantumruyPro_600SemiBold,
  KantumruyPro_700Bold,
} from '@expo-google-fonts/kantumruy-pro';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppStore } from './src/store/useAppStore';
import { syncOfflineQueue } from './src/utils/offlineStorage';
import { questionnaireAPI } from './src/services/api';
import { colors } from './src/theme';
import NetInfo from '@react-native-community/netinfo';

const INFO_COLOR = colors.app.info;

// Configure React Native Paper theme to match web app
const fontConfig = {
  web: {
    regular: {
      fontFamily: 'KantumruyPro_400Regular',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'KantumruyPro_500Medium',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'KantumruyPro_700Bold',
      fontWeight: '700',
    },
  },
  ios: {
    regular: {
      fontFamily: 'KantumruyPro_400Regular',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'KantumruyPro_500Medium',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'KantumruyPro_700Bold',
      fontWeight: '700',
    },
  },
  android: {
    regular: {
      fontFamily: 'KantumruyPro_400Regular',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'KantumruyPro_500Medium',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'KantumruyPro_700Bold',
      fontWeight: '700',
    },
  },
};

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
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

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary.dark,
    background: colors.background.dark,
    surface: colors.card.dark,
    text: colors.text.primary.dark,
    onSurface: colors.text.primary.dark,
    onBackground: colors.text.primary.dark,
    outline: colors.border.dark,
  },
  fonts: configureFonts({ config: fontConfig }),
};

export default function App() {
  const { init, locale, theme: appTheme } = useAppStore();
  const isDark = appTheme === 'dark';
  const paperTheme = isDark ? darkTheme : lightTheme;

  // Load Kantumruy Pro fonts
  const [fontsLoaded, fontError] = useFonts({
    KantumruyPro_400Regular,
    KantumruyPro_500Medium,
    KantumruyPro_600SemiBold,
    KantumruyPro_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
    if (fontsLoaded) {
      console.log('✅ Kantumruy Pro fonts loaded successfully');
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!fontsLoaded) return;
    
    // Initialize app store
    init();
    
    // Sync offline queue when app starts (delay so network is ready after cold start)
    const syncQueue = async () => {
      try {
        // Always attempt sync when NetInfo says connected; don't block on health check
        const result = await syncOfflineQueue(async (item) => {
          if (item.type === 'client') {
            await questionnaireAPI.saveClientPage(item.token, item.index, item.data);
          } else if (item.type === 'provider') {
            await questionnaireAPI.saveProviderPage(item.token, item.index, item.data);
          }
        });
        if (result.synced > 0) {
          console.log(`✅ Synced ${result.synced} offline items`);
        }
        if (result.failed > 0) {
          console.warn(`⚠️ Sync failed for ${result.failed} items`);
        }
      } catch (error) {
        console.error('Error syncing offline queue:', error);
      }
    };

    // Delay first sync so network is ready when app opens with internet
    const startSyncTimeout = setTimeout(() => {
      syncQueue();
    }, 2500);

    // Listen for network status changes and auto-sync when connection is restored
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('[App] Network connected - syncing offline queue');
        syncQueue();
      } else {
        console.log('[App] Network disconnected');
      }
    });

    return () => {
      clearTimeout(startSyncTimeout);
      unsubscribe();
    };
  }, [init, fontsLoaded]);

  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={INFO_COLOR} />
      </View>
    );
  }

  // Set Kantumruy Pro as default font for all Text app-wide
  Text.defaultProps = { ...Text.defaultProps, style: { fontFamily: 'KantumruyPro_400Regular' } };

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <PaperProvider theme={paperTheme}>
          <StatusBar 
            barStyle="light-content" 
            backgroundColor={INFO_COLOR}
            translucent={false}
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
