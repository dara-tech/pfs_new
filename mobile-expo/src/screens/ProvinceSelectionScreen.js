import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { questionnaireAPI, isConnected } from '../services/api';
import { theme, appColors } from '../theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const COLORS = appColors;

export default function ProvinceSelectionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { type } = route.params || { type: 'client' };
  const { locale } = useAppStore();
  const [allSites, setAllSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [provinces, setProvinces] = useState([]);

  const styles = createStyles(isTablet, locale);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      setLoading(true);
      console.log('[ProvinceSelection] Starting to load sites...');
      
      const connected = await isConnected();
      console.log('[ProvinceSelection] Network connected:', connected);
      
      if (!connected) {
        // Use mock data if offline
        console.log('[ProvinceSelection] Offline mode - using mock data');
        const mockSites = [
          { username: '001', sitename: 'Phnom Penh Hospital', province: 'Phnom Penh', province_kh: 'ភ្នំពេញ' },
          { username: '002', sitename: 'Kampong Cham Hospital', province: 'Kampong Cham', province_kh: 'កំពង់ចាម' },
        ];
        setAllSites(mockSites);
        extractProvinces(mockSites);
        setLoading(false);
        return;
      }

      console.log('[ProvinceSelection] Calling getSites API...');
      const response = await questionnaireAPI.getSites();
      console.log('[ProvinceSelection] API response received:', {
        status: response?.status,
        hasData: !!response?.data,
        sitesCount: response?.data?.sites?.length
      });
      
      if (response && response.data && response.data.sites) {
        console.log('[ProvinceSelection] Setting sites, count:', response.data.sites.length);
        setAllSites(response.data.sites);
        extractProvinces(response.data.sites);
      } else {
        console.warn('[ProvinceSelection] Invalid response structure:', response);
        setAllSites([]);
        setProvinces([]);
      }
    } catch (error) {
      console.error('[ProvinceSelection] Error loading sites:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      setAllSites([]);
      setProvinces([]);
    } finally {
      console.log('[ProvinceSelection] Setting loading to false');
      setLoading(false);
    }
  };

  const extractProvinces = (sites) => {
    const provinceMap = new Map();
    sites.forEach(site => {
      if (site.province && site.province !== '*') {
        if (!provinceMap.has(site.province)) {
          provinceMap.set(site.province, {
            province: site.province,
            province_kh: site.province_kh || site.province,
            siteCount: 0,
          });
        }
        provinceMap.get(site.province).siteCount++;
      }
    });
    
    const provincesList = Array.from(provinceMap.values()).sort((a, b) => {
      const aName = locale === 'kh' ? (a.province_kh || a.province) : a.province;
      const bName = locale === 'kh' ? (b.province_kh || b.province) : b.province;
      return aName.localeCompare(bName);
    });
    
    setProvinces(provincesList);
  };

  const handleProvinceSelect = (province) => {
    navigation.navigate('SiteSelection', { 
      type,
      province: province.province,
      province_kh: province.province_kh,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { fontFamily: theme.fontFamily.default }]}>
            {locale === 'kh' ? 'កំពុងផ្ទុក...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: theme.fontFamily.bold }]}>
          {locale === 'kh' ? 'ជ្រើសរើសខេត្ត' : 'Select Province'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={provinces}
        keyExtractor={(item) => item.province}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.provinceItem}
            onPress={() => handleProvinceSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.provinceInfo}>
              <Text style={[styles.provinceName, { fontFamily: theme.fontFamily.default }]}>
                {locale === 'kh' ? (item.province_kh || item.province) : item.province}
              </Text>
              <Text style={[styles.siteCount, { fontFamily: theme.fontFamily.default }]}>
                {item.siteCount} {locale === 'kh' ? 'តំបន់' : 'sites'}
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={isTablet ? 20 : 18} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { fontFamily: theme.fontFamily.default }]}>
              {locale === 'kh' ? 'គ្មានខេត្ត' : 'No provinces found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (isTablet, locale) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondaryBackground,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: isTablet ? 17 : 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: isTablet ? 20 : 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 32,
  },
  provinceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isTablet ? 20 : 18,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  provinceInfo: {
    flex: 1,
    marginRight: 16,
  },
  provinceName: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  siteCount: {
    fontSize: isTablet ? 14 : 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  arrowContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: isTablet ? 60 : 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: isTablet ? 17 : 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    opacity: 0.6,
  },
});
