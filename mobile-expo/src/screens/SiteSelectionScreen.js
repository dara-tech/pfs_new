import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { questionnaireAPI, isConnected } from '../services/api';
import { t } from '../translations';
import { theme, appColors } from '../theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const COLORS = appColors;

export default function SiteSelectionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { type, province, province_kh } = route.params || { type: 'client' };
  const { locale, setCurrentSession, theme: appTheme } = useAppStore();
  const isDark = appTheme === 'dark';
  const colors = theme.colors;
  const [allSites, setAllSites] = useState([]);
  const [sites, setSites] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const styles = createStyles(isDark, colors, isTablet);

  useEffect(() => {
    loadSites();
    loadTokens();
  }, [province]);

  useEffect(() => {
    // Filter sites by selected province
    if (province && allSites.length > 0) {
      const filtered = allSites.filter(site => {
        const siteProvince = (site.province || '').replace(/\s/g, '');
        const selectedProvinceClean = province.replace(/\s/g, '');
        return site.province === province || siteProvince === selectedProvinceClean;
      });
      setSites(filtered);
    } else {
      setSites(allSites);
    }
  }, [province, allSites]);

  const loadSites = async () => {
    try {
      setLoading(true);
      const connected = await isConnected();
      if (!connected) {
        // Use mock data if offline
        const mockSites = [
          { username: '001', sitename: 'Phnom Penh Hospital', province: 'Phnom Penh', province_kh: 'ភ្នំពេញ' },
          { username: '002', sitename: 'Kampong Cham Hospital', province: 'Kampong Cham', province_kh: 'កំពង់ចាម' },
        ];
        setAllSites(mockSites);
        if (province) {
          const filtered = mockSites.filter(site => site.province === province);
          setSites(filtered);
        } else {
          setSites(mockSites);
        }
        return;
      }

      const response = await questionnaireAPI.getSites();
      if (response.data && response.data.sites) {
        setAllSites(response.data.sites);
        // Filter by province if provided
        if (province) {
          const filtered = response.data.sites.filter(site => {
            const siteProvince = (site.province || '').replace(/\s/g, '');
            const selectedProvinceClean = province.replace(/\s/g, '');
            return site.province === province || siteProvince === selectedProvinceClean;
          });
          setSites(filtered);
        } else {
          setSites(response.data.sites);
        }
      }
    } catch (error) {
      console.error('Error loading sites:', error);
      // Fallback to empty array on error
      setAllSites([]);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTokens = async () => {
    try {
      const connected = await isConnected();
      if (!connected) {
        return;
      }

      const response = await questionnaireAPI.getTokens();
      if (response.data && response.data.tokens) {
        setTokens(response.data.tokens);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };

  const handleSiteSelect = async (site) => {
    try {
      const connected = await isConnected();
      if (!connected) {
        alert(locale === 'kh' 
          ? 'មិនមានការភ្ជាប់អ៊ីនធឺណិត។ សូមព្យាយាមម្តងទៀត។'
          : 'No internet connection. Please try again.');
        return;
      }

      // Find token that matches the selected site username (like web app does)
      const tokenData = tokens.find(t => t.username === site.username);
      if (!tokenData) {
        alert(locale === 'kh'
          ? 'រកមិនឃើញ token សម្រាប់តំបន់ដែលបានជ្រើស'
          : 'No token found for selected site');
        return;
      }

      // Use token.code (not username) - this is what backend expects
      const token = tokenData.code;
      
      // Ensure locale is set (default to 'kh')
      const currentLocale = locale || 'kh';
      
      console.log('[SiteSelection] Starting questionnaire:', { 
        siteUsername: site.username, 
        tokenCode: token, 
        currentLocale, 
        type 
      });
      
      // Start questionnaire - initial call to get UUID
      const response = type === 'client'
        ? await questionnaireAPI.getClientPage(token, currentLocale)
        : await questionnaireAPI.getProviderPage(token, currentLocale);

      console.log('[SiteSelection] Response:', { 
        status: response.status,
        hasData: !!response.data,
        uuid: response.data?.uuid,
        page: response.data?.page
      });

      if (response.data && response.data.uuid) {
        console.log('[SiteSelection] Got UUID, navigating to questionnaire:', response.data.uuid);
        setCurrentSession(token, response.data.uuid, 'consent');
        
        navigation.navigate(
          type === 'client' ? 'ClientQuestionnaire' : 'ProviderQuestionnaire',
          {
            token,
            locale: currentLocale,
            uuid: response.data.uuid,
            index: 'consent',
          }
        );
      } else {
        console.error('[SiteSelection] No UUID in response:', response.data);
        alert(locale === 'kh'
          ? 'មិនអាចចាប់ផ្តើមកម្រងសំណួរ។ សូមព្យាយាមម្តងទៀត។'
          : 'Unable to start questionnaire. Please try again.');
      }
    } catch (error) {
      console.error('[SiteSelection] Error starting questionnaire:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      alert(locale === 'kh'
        ? `មានបញ្ហាក្នុងការចាប់ផ្តើមកម្រងសំណួរ: ${error.response?.data?.error || error.message}`
        : `Error starting questionnaire: ${error.response?.data?.error || error.message}`);
    }
  };

  const filteredSites = sites.filter(site =>
    (site.sitename || site.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (site.username || site.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (site.province || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { fontFamily: theme.fontFamily.default }]}>
          {locale === 'kh' ? 'កំពុងផ្ទុក...' : 'Loading...'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background.dark : COLORS.secondaryBackground }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: theme.fontFamily.bold }]}>
          {locale === 'kh' ? 'ជ្រើសរើសតំបន់' : 'Select Site'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Province Label */}
      {province && (
        <View style={styles.provinceLabelContainer}>
          <Text style={[styles.provinceLabelText, { fontFamily: theme.fontFamily.default }]}>
            {locale === 'kh' ? (province_kh || province) : province}
          </Text>
        </View>
      )}

      {/* Search Container */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons 
            name="search" 
            size={isTablet ? 20 : 18} 
            color={COLORS.textSecondary} 
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { fontFamily: theme.fontFamily.default }]}
            placeholder={locale === 'kh' ? 'ស្វែងរកតំបន់...' : 'Search sites...'}
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredSites}
        keyExtractor={(item) => item.username || item.code || item.id || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.siteItem}
            onPress={() => handleSiteSelect(item)}
            activeOpacity={0.7}
          >
            <View style={styles.siteInfo}>
              <Text style={[styles.siteName, { fontFamily: theme.fontFamily.default }]}>
                {item.sitename || item.name || 'Unknown Site'}
              </Text>
              <View style={styles.siteMeta}>
                <Text style={[styles.siteCode, { fontFamily: theme.fontFamily.default }]}>
                  {item.username || item.code || 'N/A'}
                </Text>
                <View style={styles.provinceBadge}>
                  <Text style={[styles.provinceText, { fontFamily: theme.fontFamily.default }]}>
                    {item.province || item.province_kh || 'Unknown Province'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={isTablet ? 20 : 18} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { fontFamily: theme.fontFamily.default }]}>
              {locale === 'kh' ? 'គ្មានតំបន់' : 'No sites found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (isDark, colors, isTablet) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  provinceLabelContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  provinceLabelText: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: isTablet ? 17 : 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.searchBg,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: isTablet ? 17 : 16,
    fontWeight: '400',
    color: COLORS.text,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: isTablet ? 24 : 16,
  },
  siteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  siteInfo: {
    flex: 1,
    marginRight: 12,
  },
  siteName: {
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  siteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  siteCode: {
    fontSize: isTablet ? 14 : 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  provinceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '20',
  },
  provinceText: {
    fontSize: isTablet ? 12 : 11,
    fontWeight: '500',
    color: COLORS.primary,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: isTablet ? 60 : 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: isTablet ? 17 : 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
});
