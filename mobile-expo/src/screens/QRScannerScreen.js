import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/useAppStore';
import { theme, appColors } from '../theme';
import { questionnaireAPI, getNetworkState, isConnected, isNetworkError } from '../services/api';
import { getOfflineQueue, syncOfflineQueue } from '../utils/offlineStorage';
import { getSectionTitle } from '../utils/questionHelper';
import { getProviderSectionTitle } from '../utils/questionHelper';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const COLORS = appColors;

export default function QRScannerScreen() {
  const navigation = useNavigation();
  const { locale } = useAppStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const wasOfflineRef = React.useRef(false);
  
  const hasPermission = permission?.granted;

  // Log permission status for debugging
  React.useEffect(() => {
    console.log('[QRScanner] Permission status:', {
      granted: permission?.granted,
      canAskAgain: permission?.canAskAgain,
      status: permission?.status
    });
  }, [permission]);

  // Sync offline queue function
  const handleSyncQueue = async () => {
    console.log('[QRScanner] handleSyncQueue called:', { syncing, isOnline, offlineQueueLength: offlineQueue.length });
    
    if (syncing) {
      console.log('[QRScanner] ⚠️ Already syncing, skipping');
      return;
    }
    
    if (!isOnline) {
      console.log('[QRScanner] ⚠️ Not online, cannot sync');
      Alert.alert(
        locale === 'kh' ? 'កំហុស' : 'Error',
        locale === 'kh' ? 'មិនមានការតភ្ជាប់អ៊ីនធឺណិត' : 'No internet connection',
        [{ text: locale === 'kh' ? 'យល់ព្រម' : 'OK' }]
      );
      return;
    }
    
    if (offlineQueue.length === 0) {
      console.log('[QRScanner] ⚠️ No items in queue to sync');
      Alert.alert(
        locale === 'kh' ? 'ព័ត៌មាន' : 'Info',
        locale === 'kh' ? 'មិនមានទិន្នន័យត្រូវធ្វើសមកាលកម្ម' : 'No data to sync',
        [{ text: locale === 'kh' ? 'យល់ព្រម' : 'OK' }]
      );
      return;
    }
    
    console.log('[QRScanner] 🚀 Starting sync...');
    setSyncing(true);
    try {
      const result = await syncOfflineQueue(async (item) => {
        console.log('[QRScanner] Processing sync item:', { type: item.type, token: item.token, index: item.index });
        if (item.type === 'client') {
          await questionnaireAPI.saveClientPage(item.token, item.index, item.data);
        } else if (item.type === 'provider') {
          await questionnaireAPI.saveProviderPage(item.token, item.index, item.data);
        }
      });
      
      // Reload queue to show updated count
      await loadOfflineQueue();
      
      const totalProcessed = result.synced + result.failed + (result.removed || 0);
      
      if (result.synced > 0 || result.removed > 0) {
        let message = '';
        if (result.synced > 0 && result.removed > 0) {
          message = locale === 'kh'
            ? `បានធ្វើសមកាលកម្ម ${result.synced} ធាតុ\nបានលុប ${result.removed} ធាតុដែលមិនត្រឹមត្រូវ`
            : `Synced ${result.synced} items\nRemoved ${result.removed} invalid items`;
        } else if (result.synced > 0) {
          message = locale === 'kh'
            ? `បានធ្វើសមកាលកម្ម ${result.synced} ធាតុ`
            : `Synced ${result.synced} items`;
        } else if (result.removed > 0) {
          message = locale === 'kh'
            ? `បានលុប ${result.removed} ធាតុដែលមិនត្រឹមត្រូវ (token ផុតកំណត់)`
            : `Removed ${result.removed} invalid items (expired tokens)`;
        }
        
        Alert.alert(
          locale === 'kh' ? 'ជោគជ័យ' : 'Success',
          message,
          [{ text: locale === 'kh' ? 'យល់ព្រម' : 'OK' }]
        );
      } else if (result.failed > 0) {
        Alert.alert(
          locale === 'kh' ? 'កំហុស' : 'Error',
          locale === 'kh'
            ? `មិនអាចធ្វើសមកាលកម្ម ${result.failed} ធាតុ\nសូមព្យាយាមម្តងទៀត`
            : `Failed to sync ${result.failed} items\nPlease try again`,
          [{ text: locale === 'kh' ? 'យល់ព្រម' : 'OK' }]
        );
      } else {
        Alert.alert(
          locale === 'kh' ? 'ព័ត៌មាន' : 'Info',
          locale === 'kh' ? 'មិនមានទិន្នន័យត្រូវធ្វើសមកាលកម្ម' : 'No data to sync',
          [{ text: locale === 'kh' ? 'យល់ព្រម' : 'OK' }]
        );
      }
    } catch (error) {
      console.error('[QRScanner] Error syncing queue:', error);
      Alert.alert(
        locale === 'kh' ? 'កំហុស' : 'Error',
        locale === 'kh' ? 'មិនអាចធ្វើសមកាលកម្ម' : 'Failed to sync',
        [{ text: locale === 'kh' ? 'យល់ព្រម' : 'OK' }]
      );
    } finally {
      setSyncing(false);
    }
  };

  // Network status monitoring
  useEffect(() => {
    // Check initial network status
    getNetworkState().then(state => {
      console.log('[QRScanner] Initial network state:', {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
        details: state.details
      });
      setIsOnline(state.isConnected);
      wasOfflineRef.current = !state.isConnected;
    });

    // Listen for network status changes
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const networkState = await getNetworkState();
      const isConnected = networkState.isConnected;
      const wasOffline = wasOfflineRef.current;
      
      console.log('[QRScanner] Network state changed:', {
        isConnected,
        type: networkState.type,
        isInternetReachable: networkState.isInternetReachable,
        wasOffline,
        details: networkState.details
      });
      
      setIsOnline(isConnected);
      
      // If we were offline and now we're online, trigger sync
      if (wasOffline && isConnected && offlineQueue.length > 0) {
        console.log('[QRScanner] 🌐 Network connection restored - syncing offline queue...');
        // Trigger sync when connection restored - call syncOfflineQueue directly to avoid dependency issues
        syncOfflineQueue(async (item) => {
          console.log('[QRScanner] Auto-sync processing item:', { type: item.type, token: item.token, index: item.index });
          if (item.type === 'client') {
            await questionnaireAPI.saveClientPage(item.token, item.index, item.data);
          } else if (item.type === 'provider') {
            await questionnaireAPI.saveProviderPage(item.token, item.index, item.data);
          }
        }).then((result) => {
          console.log('[QRScanner] Auto-sync result:', result);
          loadOfflineQueue();
        }).catch((error) => {
          console.error('[QRScanner] Auto-sync error:', error);
        });
      }
      
      wasOfflineRef.current = !isConnected;
    });

    return () => {
      unsubscribe();
    };
  }, [offlineQueue.length]); // Include offlineQueue.length in dependencies

  // Load offline queue
  const loadOfflineQueue = async () => {
    try {
      const queue = await getOfflineQueue();
      console.log('[QRScanner] Offline queue loaded:', queue.length, 'items', JSON.stringify(queue, null, 2));
      setOfflineQueue(queue || []);
    } catch (error) {
      console.error('[QRScanner] Error loading offline queue:', error);
      setOfflineQueue([]);
    }
  };

  // Load queue on mount and when network status changes
  useEffect(() => {
    loadOfflineQueue();

    const interval = setInterval(() => {
      loadOfflineQueue();
    }, 2000);

    return () => clearInterval(interval);
  }, [isOnline]);

  // Reload queue when this screen gains focus (e.g. after background sync on app open)
  useFocusEffect(
    React.useCallback(() => {
      loadOfflineQueue();
    }, [])
  );

  const processQRData = async (data) => {
    if (loading) return;
    
    setLoading(true);

    try {
      // Parse QR code data or manual input
      // Expected format: http://domain/client/TOKEN/locale or http://domain/provider/TOKEN/locale
      // Or: client/TOKEN/locale or provider/TOKEN/locale
      // Or just: TOKEN (we'll default to client/kh)
      
      let url = data.trim();
      
      // If it's just a token (no slashes), treat it as client questionnaire
      if (!url.includes('/')) {
        url = `client/${url}/kh`;
      }
      
      if (!url.startsWith('http')) {
        // If it's a relative URL, prepend a base URL
        url = `http://${url}`;
      }

      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      if (pathParts.length < 2) {
        throw new Error('Invalid format. Expected: client/TOKEN or provider/TOKEN');
      }

      const type = pathParts[0]; // 'client' or 'provider'
      const token = pathParts[1];
      const locale = pathParts[2] || 'kh';

      if (type !== 'client' && type !== 'provider') {
        throw new Error('Invalid questionnaire type. Must be "client" or "provider"');
      }

      // Check if we're online
      const connected = await isConnected();
      
      if (!connected) {
        // Offline mode: Navigate directly to questionnaire with offline flag
        // The questionnaire screen will handle offline mode
        console.log('[QRScanner] Offline mode - navigating to questionnaire with token:', token);
        
        if (type === 'client') {
          navigation.replace('ClientQuestionnaire', {
            token,
            locale,
            uuid: undefined, // Will be generated or loaded from cache
            index: 'consent',
          });
        } else {
          navigation.replace('ProviderQuestionnaire', {
            token,
            locale,
            uuid: undefined, // Will be generated or loaded from cache
            index: 'consent',
          });
        }
        setLoading(false);
        return;
      }

      // Online mode: Fetch questionnaire data from server
      let response;
      try {
        response = type === 'client'
          ? await questionnaireAPI.getClientPage(token, locale)
          : await questionnaireAPI.getProviderPage(token, locale);
      } catch (apiError) {
        // Check if it's a network error using helper function
        if (isNetworkError(apiError)) {
          console.log('[QRScanner] Network error detected, falling back to offline mode:', {
            message: apiError.message,
            code: apiError.code,
          });
          // Fall through to offline mode navigation
          throw { ...apiError, isNetworkError: true };
        }
        // Re-throw other errors
        throw apiError;
      }

      if (response && response.data && response.data.uuid) {
        // Navigate to questionnaire
        if (type === 'client') {
          navigation.replace('ClientQuestionnaire', {
            token,
            locale,
            uuid: response.data.uuid,
            index: 'consent',
          });
        } else {
          navigation.replace('ProviderQuestionnaire', {
            token,
            locale,
            uuid: response.data.uuid,
            index: 'consent',
          });
        }
        setLoading(false);
        return;
      } else {
        throw new Error('Failed to start questionnaire');
      }
    } catch (error) {
      console.error('[QRScanner] Process error:', {
        message: error.message,
        code: error.code,
        isNetworkError: error.isNetworkError,
        response: error.response?.status,
      });
      
      // Check if it's a network error or if we're offline
      const connected = await isConnected();
      const hasNetworkError = error.isNetworkError || isNetworkError(error);
      
      // If offline or network error, navigate to offline mode
      if (!connected || hasNetworkError) {
        // Extract token even if URL parsing failed
        let token = data.trim();
        let type = 'client';
        let locale = 'kh';
        
        try {
          let url = data.trim();
          if (!url.includes('/')) {
            url = `client/${url}/kh`;
          }
          if (!url.startsWith('http')) {
            url = `http://${url}`;
          }
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/').filter(p => p);
          if (pathParts.length >= 2) {
            type = pathParts[0];
            token = pathParts[1];
            locale = pathParts[2] || 'kh';
          }
        } catch (e) {
          // If parsing fails, use token as-is
        }
        
        console.log('[QRScanner] Offline mode - navigating with extracted token:', token);
        if (type === 'client') {
          navigation.replace('ClientQuestionnaire', {
            token,
            locale,
            uuid: undefined,
            index: 'consent',
          });
        } else {
          navigation.replace('ProviderQuestionnaire', {
            token,
            locale,
            uuid: undefined,
            index: 'consent',
          });
        }
        setLoading(false);
        return;
      }
      
      // Show user-friendly error message
      const errorMessage = hasNetworkError 
        ? (locale === 'kh'
          ? 'មិនមានការតភ្ជាប់អ៊ីនធឺណិត។ កំពុងប្រើប្រាស់របៀបអត់អ៊ីនធឺណិត។'
          : 'No internet connection. Using offline mode.')
        : (error.message || (locale === 'kh'
          ? 'មិនអាចចាប់ផ្តើមកម្រងសំណួរបានទេ។'
          : 'Could not start questionnaire.'));
      
      Alert.alert(
        locale === 'kh' ? 'កំហុស' : 'Error',
        errorMessage,
        [
          {
            text: locale === 'kh' ? 'យល់ព្រម' : 'OK',
            onPress: () => setLoading(false),
          },
        ]
      );
      setLoading(false);
    }
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    await processQRData(data);
    // Reset scanned after a delay to allow re-scanning
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      Alert.alert(
        locale === 'kh' ? 'កំហុស' : 'Error',
        locale === 'kh' ? 'សូមបញ្ចូល token ឬ URL' : 'Please enter a token or URL'
      );
      return;
    }
    processQRData(manualInput);
  };

  // Show manual input if permission denied
  if (hasPermission === false && showManualInput) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Network Status Indicator */}
        <View style={[styles.statusBar, isOnline ? styles.statusBarOnline : styles.statusBarOffline]}>
          <Ionicons 
            name={isOnline ? "wifi" : "wifi-outline"} 
            size={16} 
            color={isOnline ? COLORS.success : COLORS.errorAlt} 
          />
          <Text style={[styles.statusText, { fontFamily: theme.fontFamily.default }]}>
            {isOnline 
              ? (locale === 'kh' ? 'អ៊ីនធឺណិត' : 'Online')
              : (locale === 'kh' ? 'អត់អ៊ីនធឺណិត' : 'Offline')
            }
          </Text>
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="menu" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: theme.fontFamily.bold }]}>
            {locale === 'kh' ? 'បញ្ចូល Token' : 'Enter Token'}
          </Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.centerContent}>
          {hasPermission === false && (
            <>
              <Ionicons name="camera-outline" size={64} color={COLORS.textSecondary} />
              <Text style={[styles.title, { fontFamily: theme.fontFamily.bold }]}>
                {locale === 'kh' ? 'ត្រូវការការអនុញ្ញាតកាមេរ៉ា' : 'Camera Permission Required'}
              </Text>
              <Text style={[styles.text, styles.textCenter, { fontFamily: theme.fontFamily.default }]}>
                {locale === 'kh'
                  ? 'សូមបញ្ចូល token ឬ URL ដើម្បីចាប់ផ្តើមកម្រងសំណួរ'
                  : 'Please enter token or URL to start questionnaire'}
              </Text>
            </>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { fontFamily: theme.fontFamily.default }]}
              placeholder={locale === 'kh' ? 'Token ឬ URL (ឧ. ABC123 ឬ client/ABC123/kh)' : 'Token or URL (e.g. ABC123 or client/ABC123/kh)'}
              placeholderTextColor={COLORS.textSecondary}
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleManualSubmit}
              disabled={loading}
            >
              <Text style={[styles.submitButtonText, { fontFamily: theme.fontFamily.default }]}>
                {loading 
                  ? (locale === 'kh' ? 'កំពុងផ្ទុក...' : 'Loading...')
                  : (locale === 'kh' ? 'ចាប់ផ្តើម' : 'Start')}
              </Text>
            </TouchableOpacity>
          </View>

          {hasPermission === false && (
            <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                try {
                  const result = await requestPermission();
                  if (result.granted) {
                    setShowManualInput(false);
                  }
                } catch (error) {
                  console.error('Permission error:', error);
                }
              }}
            >
              <Text style={[styles.buttonText, { fontFamily: theme.fontFamily.default }]}>
                {locale === 'kh' ? 'ស្កេន QR Code' : 'Scan QR Code'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (permission === null) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Network Status Indicator */}
        <View style={[styles.statusBar, isOnline ? styles.statusBarOnline : styles.statusBarOffline]}>
          <Ionicons 
            name={isOnline ? "wifi" : "wifi-outline"} 
            size={16} 
            color={isOnline ? COLORS.success : COLORS.errorAlt} 
          />
          <Text style={[styles.statusText, { fontFamily: theme.fontFamily.default }]}>
            {isOnline 
              ? (locale === 'kh' ? 'អ៊ីនធឺណិត' : 'Online')
              : (locale === 'kh' ? 'អត់អ៊ីនធឺណិត' : 'Offline')
            }
          </Text>
        </View>

        <View style={styles.centerContent}>
          <Text style={[styles.text, { fontFamily: theme.fontFamily.default }]}>
            {locale === 'kh' ? 'កំពុងស្នើសុំការអនុញ្ញាត...' : 'Requesting camera permission...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Network Status Indicator */}
      <View style={[styles.statusBar, isOnline ? styles.statusBarOnline : styles.statusBarOffline]}>
        <Ionicons 
          name={isOnline ? "wifi" : "wifi-outline"} 
          size={16} 
          color={isOnline ? COLORS.success : COLORS.errorAlt} 
        />
        <Text style={[styles.statusText, { fontFamily: theme.fontFamily.default }]}>
          {isOnline 
            ? (locale === 'kh' ? 'អ៊ីនធឺណិត' : 'Online')
            : (locale === 'kh' ? 'អត់អ៊ីនធឺណិត' : 'Offline')
          }
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="menu" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: theme.fontFamily.bold }]}>
          {locale === 'kh' ? 'ស្កេន QR Code' : 'Scan QR Code'}
        </Text>
        <View style={styles.headerButton} />
      </View>

      {/* Scanner */}
      <View style={[
        styles.scannerContainer,
        offlineQueue.length > 0 && { flex: 0.7 }
      ]}>
        {hasPermission ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            onMountError={(error) => {
              console.error('[QRScanner] Camera mount error:', error);
              setCameraError(error.message);
            }}
          />
        ) : (
          <View style={styles.scannerPlaceholder}>
            <Ionicons name="camera-outline" size={64} color={COLORS.textSecondary} />
            <Text style={[styles.placeholderText, { fontFamily: theme.fontFamily.default }]}>
              {locale === 'kh' ? 'កាមេរ៉ាមិនអាចប្រើបាន' : 'Camera not available'}
            </Text>
            {permission && !permission.granted && (
              <TouchableOpacity
                style={styles.button}
                onPress={async () => {
                  try {
                    const result = await requestPermission();
                    console.log('[QRScanner] Permission request result:', result);
                  } catch (error) {
                    console.error('[QRScanner] Permission error:', error);
                  }
                }}
              >
                <Text style={[styles.buttonText, { fontFamily: theme.fontFamily.default }]}>
                  {locale === 'kh' ? 'ស្នើសុំការអនុញ្ញាត' : 'Request Permission'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {cameraError && (
          <View style={styles.errorOverlay}>
            <Text style={[styles.errorText, { fontFamily: theme.fontFamily.default }]}>
              {locale === 'kh' ? `កំហុស: ${cameraError}` : `Error: ${cameraError}`}
            </Text>
          </View>
        )}
        
        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={[styles.instructionText, { fontFamily: theme.fontFamily.default }]}>
            {locale === 'kh'
              ? 'ដាក់ QR Code នៅក្នុងប្រអប់'
              : 'Position QR code within the frame'}
          </Text>
        </View>
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={[styles.loadingText, { fontFamily: theme.fontFamily.default }]}>
            {locale === 'kh' ? 'កំពុងផ្ទុក...' : 'Loading...'}
          </Text>
        </View>
      )}

      {/* Offline Queue List - Always visible */}
      <View style={[
        styles.offlineQueueContainer,
        offlineQueue.length > 0 && { flex: 0.3 }
      ]}>
        <View style={styles.offlineQueueHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.text} />
            <Text style={[styles.offlineQueueTitle, { fontFamily: theme.fontFamily.bold }]}>
              {locale === 'kh' 
                ? `ទិន្នន័យរង់ចាំសម្រុង (${offlineQueue.length})`
                : `Pending Sync (${offlineQueue.length})`}
            </Text>
          </View>
          {isOnline && offlineQueue.length > 0 && (
            <TouchableOpacity
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              onPress={handleSyncQueue}
              disabled={syncing}
            >
              <Ionicons 
                name={syncing ? "hourglass-outline" : "sync"} 
                size={18} 
                color={syncing ? COLORS.textSecondary : COLORS.success} 
              />
              <Text style={[styles.syncButtonText, { fontFamily: theme.fontFamily.default }]}>
                {syncing 
                  ? (locale === 'kh' ? 'កំពុង...' : 'Syncing...')
                  : (locale === 'kh' ? 'សម្រុង' : 'Sync')
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {__DEV__ && (
          <Text style={{ fontSize: 10, color: COLORS.textSecondary, paddingHorizontal: 16 }}>
            Debug: Queue length = {offlineQueue.length}
          </Text>
        )}
        {offlineQueue.length > 0 ? (
          <ScrollView 
            style={styles.offlineQueueList}
            contentContainerStyle={{ flexGrow: 1 }}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {offlineQueue.map((item, idx) => {
              // Get section title from translations
              let sectionTitle = item.type === 'client' 
                ? getSectionTitle(item.index, locale)
                : getProviderSectionTitle(item.index, locale);
              
              // Debug logging
              if (__DEV__) {
                console.log('[QRScanner] Queue item:', {
                  type: item.type,
                  index: item.index,
                  sectionTitle,
                  hasTitle: !!sectionTitle
                });
              }
              
              // If no title found, create a readable name from the index
              if (!sectionTitle && item.index) {
                const indexMap = {
                  'consent': locale === 'kh' ? 'ការយល់ព្រម' : 'Consent',
                  'section1': locale === 'kh' ? 'ផ្នែក 1: ព័ត៌មានគ្រឹះស្ថាន' : 'Section 1: Facility Info',
                  'section1a': locale === 'kh' ? 'ផ្នែក A: សេវា ART' : 'Section A: ART Services',
                  'section1a1': locale === 'kh' ? 'ផ្នែក A1' : 'Section A1',
                  'section1b': locale === 'kh' ? 'ផ្នែក B: សេវាផ្សេងៗ' : 'Section B: Other Services',
                  'section1c': locale === 'kh' ? 'ផ្នែក C: ព័ត៌មានផ្ទាល់ខ្លួន' : 'Section C: Personal Info',
                  'section5c': locale === 'kh' ? 'ផ្នែក 5C' : 'Section 5C',
                  'section6c': locale === 'kh' ? 'ផ្នែក 6C: ផ្នែកចុងក្រោយ' : 'Section 6C: Final Part',
                };
                sectionTitle = indexMap[item.index];
                if (!sectionTitle) {
                  // Fallback: format the index nicely
                  sectionTitle = item.index
                    .replace(/section/gi, locale === 'kh' ? 'ផ្នែក' : 'Section')
                    .replace(/([a-z])([A-Z0-9])/g, '$1 $2');
                }
              }
              
              const typeLabel = item.type === 'client'
                ? (locale === 'kh' ? 'អ្នកជំងឺ' : 'Client')
                : (locale === 'kh' ? 'បុគ្គលិក' : 'Provider');
              const date = new Date(item.timestamp);
              const timeStr = date.toLocaleTimeString(locale === 'kh' ? 'km-KH' : 'en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              
              return (
                <View key={item.id || idx} style={styles.offlineQueueItem}>
                  <View style={styles.queueItemLeft}>
                    <Ionicons 
                      name={item.type === 'client' ? 'person' : 'medical'} 
                      size={16} 
                      color={item.type === 'client' ? COLORS.info : COLORS.success} 
                    />
                    <View style={styles.queueItemInfo}>
                      <Text style={[styles.queueItemType, { fontFamily: theme.fontFamily.default }]}>
                        {typeLabel} - {item.token?.substring(0, 8) || 'N/A'}
                      </Text>
                      <Text style={[styles.queueItemSection, { fontFamily: theme.fontFamily.default }]} numberOfLines={1}>
                        {sectionTitle || (locale === 'kh' ? 'មិនស្គាល់' : 'Unknown')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.queueItemTime, { fontFamily: theme.fontFamily.default }]}>
                    {timeStr}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyQueueContainer}>
            <Text style={[styles.emptyQueueText, { fontFamily: theme.fontFamily.default }]}>
              {locale === 'kh' 
                ? 'មិនមានទិន្នន័យរង់ចាំសម្រុង'
                : 'No pending data to sync'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  statusBarOnline: {
    backgroundColor: COLORS.success + '15',
  },
  statusBarOffline: {
    backgroundColor: COLORS.errorAlt + '15',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
    minHeight: 300,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    width: '100%',
  },
  overlayMiddle: {
    flexDirection: 'row',
    width: '100%',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    width: '100%',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.info,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: isTablet ? 16 : 14,
    color: COLORS.background,
    backgroundColor: COLORS.overlayDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: isTablet ? 16 : 14,
    color: COLORS.textSecondary,
  },
  textCenter: {
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.info,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: isTablet ? 18 : 16,
    color: COLORS.background,
    marginTop: 16,
  },
  inputContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 24,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: isTablet ? 16 : 14,
    color: COLORS.text,
    marginBottom: 16,
  },
  submitButton: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.info,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  infoBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: COLORS.infoLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.info + '99',
  },
  infoText: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.info,
    textAlign: 'center',
  },
  scannerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.text,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: isTablet ? 16 : 14,
    color: COLORS.background,
    textAlign: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: COLORS.errorAlt + 'E6',
    padding: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.background,
    textAlign: 'center',
  },
  offlineQueueContainer: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    minHeight: 60,
  },
  offlineQueueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.muted,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.selectedBg,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  syncButtonDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.muted,
    borderColor: COLORS.textSecondary,
  },
  syncButtonText: {
    fontSize: isTablet ? 14 : 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  offlineQueueTitle: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  offlineQueueList: {
    paddingVertical: 8,
  },
  offlineQueueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemType: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  queueItemSection: {
    fontSize: isTablet ? 12 : 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  queueItemTime: {
    fontSize: isTablet ? 12 : 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  emptyQueueContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyQueueText: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
