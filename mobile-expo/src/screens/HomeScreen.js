import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '../store/useAppStore';
import { theme, appColors } from '../theme';
import { getNetworkState } from '../services/api';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const COLORS = appColors;

export default function HomeScreen() {
  const navigation = useNavigation();
  const { locale } = useAppStore();
  const [isOnline, setIsOnline] = useState(true);
  const styles = createStyles(isTablet, locale);

  useEffect(() => {
    getNetworkState().then(state => {
      setIsOnline(state.isConnected);
    });

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const networkState = await getNetworkState();
      setIsOnline(networkState.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleScanPress = () => {
    navigation.navigate('QRScanner');
  };

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

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="qr-code" size={80} color={COLORS.primary} />
        </View>
        
        <Text style={[styles.title, { fontFamily: theme.fontFamily.bold }]}>
          {locale === 'kh' ? 'ស្កេន QR Code' : 'Scan QR Code'}
        </Text>
        
        <Text style={[styles.subtitle, { fontFamily: theme.fontFamily.default }]}>
          {locale === 'kh' 
            ? 'ស្កេន QR Code ដើម្បីចាប់ផ្តើមកម្រងសំណួរ'
            : 'Scan QR Code to start questionnaire'}
        </Text>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanPress}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={24} color={COLORS.white} />
          <Text style={[styles.scanButtonText, { fontFamily: theme.fontFamily.bold }]}>
            {locale === 'kh' ? 'ស្កេន' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (isTablet, locale) => StyleSheet.create({
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.info + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden',
  },
  title: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isTablet ? 17 : 15,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: isTablet ? 24 : 22,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 12,
    gap: 12,
    minWidth: 200,
    shadowColor: COLORS.shadowBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonText: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: COLORS.white,
  },
});
