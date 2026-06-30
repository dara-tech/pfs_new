import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';
import { questionnaireAPI, isConnected, isNetworkError } from '../../services/api';
import { addToOfflineQueue, saveFormDataLocally, getFormDataLocally } from '../../utils/offlineStorage';
import { t } from '../../translations';
import QuestionComponent from '../../components/QuestionComponent';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import StepDots from '../../components/StepDots';
import { theme } from '../../theme';
import { getQuestionsForSection, getSectionTitle, getSectionContent } from '../../utils/questionHelper';
import { appColors } from '../../theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const COLORS = appColors;

// Define section order for progress calculation
const SECTION_ORDER = ['consent', 'section1a', 'section1a1', 'section1b', 'section1c', 'section5c', 'section6c'];

export default function ClientQuestionnaireScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, locale: routeLocale, uuid, index } = route.params || {};
  const { locale, formData, setFormData, setCurrentSession } = useAppStore();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [milestoneMessage, setMilestoneMessage] = useState(null);
  const milestoneShownRef = useRef({ 25: false, 50: false, 75: false });

  const currentLocale = routeLocale || locale || 'kh';
  const currentIndex = index || 'consent';
  const styles = createStyles(isTablet, currentLocale);

  // Calculate progress
  const currentSectionIndex = SECTION_ORDER.indexOf(currentIndex);
  const currentQuestionNumber = currentSectionIndex >= 0 ? currentSectionIndex + 1 : 1;
  const totalQuestions = SECTION_ORDER.length;
  const progress = currentSectionIndex >= 0 
    ? ((currentSectionIndex + 1) / SECTION_ORDER.length) * 100 
    : 0;

  // Section entrance: fade + slide when section changes
  const sectionEntranceOpacity = useRef(new Animated.Value(0)).current;
  const sectionEntranceTranslateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    sectionEntranceOpacity.setValue(0);
    sectionEntranceTranslateY.setValue(8);
    Animated.parallel([
      Animated.timing(sectionEntranceOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(sectionEntranceTranslateY, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [currentIndex]);

  // Next button pulse when Continue becomes enabled
  const nextButtonScale = useRef(new Animated.Value(1)).current;
  const prevAllAnswered = useRef(allQuestionsAnswered);
  useEffect(() => {
    if (allQuestionsAnswered && !prevAllAnswered.current) {
      prevAllAnswered.current = true;
      Animated.sequence([
        Animated.timing(nextButtonScale, { toValue: 1.04, duration: 120, useNativeDriver: true }),
        Animated.timing(nextButtonScale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
    if (!allQuestionsAnswered) prevAllAnswered.current = false;
  }, [allQuestionsAnswered]);

  // Milestone messages at 25%, 50%, 75%
  useEffect(() => {
    const p = Math.round(progress);
    const messages = {
      en: { 25: "You're on your way!", 50: "You're halfway there!", 75: "Almost done!" },
      kh: { 25: 'អ្នកកំពុងធ្វើដំណើរល្អ!', 50: 'អ្នកធ្វើបានពាក់កណ្តាលហើយ!', 75: 'ជិតរួចរាល់ហើយ!' },
    };
    const lang = currentLocale === 'kh' ? 'kh' : 'en';
    if (p >= 25 && !milestoneShownRef.current[25]) {
      milestoneShownRef.current[25] = true;
      setMilestoneMessage(messages[lang][25]);
    }
    if (p >= 50 && !milestoneShownRef.current[50]) {
      milestoneShownRef.current[50] = true;
      setMilestoneMessage(messages[lang][50]);
    }
    if (p >= 75 && !milestoneShownRef.current[75]) {
      milestoneShownRef.current[75] = true;
      setMilestoneMessage(messages[lang][75]);
    }
  }, [progress, currentLocale]);
  useEffect(() => {
    if (!milestoneMessage) return;
    const t = setTimeout(() => setMilestoneMessage(null), 2500);
    return () => clearTimeout(t);
  }, [milestoneMessage]);

  // Get questions for current section from translations
  const sectionQuestions = pageData ? getQuestionsForSection(currentIndex, currentLocale) : [];
  // C14 (q14c) only shown when C13 (q13c) is Yes (value '1'); otherwise section is submittable without C14
  const visibleSectionQuestions =
    currentIndex === 'section6c'
      ? sectionQuestions.filter((q) => q.name !== 'q14c' || formData.q13c === '1')
      : sectionQuestions;

  // Clear q14c when user answers C13 as No so we don't submit stale phone number
  useEffect(() => {
    if (currentIndex === 'section6c' && formData.q13c !== undefined && formData.q13c !== '1' && (formData.q14c !== undefined && formData.q14c !== '')) {
      setFormData({ q14c: '' });
    }
  }, [currentIndex, formData.q13c]);

  // Check if all questions in section are answered (only visible questions count)
  const allQuestionsAnswered = visibleSectionQuestions.every(q => {
    if (q.type === 'checkbox') {
      // For checkbox questions, check if at least one option is selected
      // Backend expects individual fields like q3c_1, q3c_2, etc.
      return q.options.some(opt => {
        const fieldName = `${q.name}_${opt.value}`;
        return formData[fieldName] === '1' || formData[fieldName] === 1;
      });
    }
    const value = formData[q.name];
    return value !== undefined && value !== null && value !== '';
  });
  
  // Helper function to replace <br> tags with newlines
  const replaceBrTags = (text) => {
    if (!text) return '';
    return String(text).replace(/<br\s*\/?>/gi, '\n');
  };

  // Get section title and content
  const sectionTitle = pageData ? replaceBrTags(getSectionTitle(currentIndex, currentLocale)) : '';
  const sectionContent = pageData ? replaceBrTags(getSectionContent(currentIndex, currentLocale)) : '';

  // Get section icon
  const getSectionIcon = (index) => {
    const icons = {
      consent: 'document-text',
      section1a: 'heart',
      section1a1: 'medical',
      section1b: 'clipboard',
      section1c: 'checkmark-circle',
      section5c: 'star',
      section6c: 'call',
    };
    return icons[index] || 'help-circle';
  };



  useEffect(() => {
    loadPage();
  }, [token, currentLocale, uuid, currentIndex]);

  const loadPage = async () => {
    if (!token) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('QRScanner');
      }
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Check if we're offline - load questions from translations
      const connected = await isConnected();
      if (!connected) {
        console.log('[ClientQuestionnaire] Offline mode - loading questions from translations');
        // Try to load saved form data if we have uuid
        if (uuid) {
          const savedData = await getFormDataLocally(uuid);
          if (savedData) {
            setFormData(savedData);
          }
        }
        // Create a minimal pageData structure for offline mode
        // Questions will be loaded from translations via getQuestionsForSection
        setPageData({ uuid: uuid || 'offline', page: currentIndex, offline: true });
        setLoading(false);
        return;
      }
      
      // Only pass index if we have a uuid (for subsequent pages)
      // On first load (no uuid), don't pass index to get initial UUID
      const indexToUse = uuid ? currentIndex : undefined;
      console.log('[ClientQuestionnaire] loadPage:', { token, currentLocale, uuid, currentIndex, indexToUse });
      
      let response;
      try {
        response = await questionnaireAPI.getClientPage(
          token,
          currentLocale,
          uuid,
          indexToUse
        );
      } catch (apiError) {
        // Check if it's a network error
        if (isNetworkError(apiError)) {
          console.log('[ClientQuestionnaire] Network error detected, falling back to offline mode:', {
            message: apiError.message,
            code: apiError.code,
          });
          // Fall through to offline mode handling
          throw { ...apiError, isNetworkError: true };
        }
        // Re-throw other errors
        throw apiError;
      }

      console.log('[ClientQuestionnaire] Response:', { 
        status: response.status, 
        hasData: !!response.data,
        uuid: response.data?.uuid,
        page: response.data?.page 
      });

      if (response.data) {
        setPageData(response.data);
        
        // If we got a UUID but don't have one, redirect to consent page
        if (response.data.uuid && !uuid) {
          console.log('[ClientQuestionnaire] Got UUID, redirecting to consent:', response.data.uuid);
          setCurrentSession(token, response.data.uuid, 'consent');
          navigation.replace('ClientQuestionnaire', {
            token,
            locale: currentLocale,
            uuid: response.data.uuid,
            index: 'consent',
          });
          return;
        }

        // Load saved form data if we have a uuid
        if (uuid) {
          const savedData = await getFormDataLocally(uuid);
          if (savedData) {
            setFormData(savedData);
          }
          await saveFormDataLocally(uuid, formData);
        }
      }
    } catch (error) {
      console.error('[ClientQuestionnaire] Error loading page:', {
        message: error.message,
        code: error.code,
        isNetworkError: error.isNetworkError,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      
      // Check if it's a network error or if we're offline
      const connected = await isConnected();
      const hasNetworkError = error.isNetworkError || isNetworkError(error);
      
      // If offline or network error, load questions from translations (offline mode)
      if (!connected || hasNetworkError) {
        console.log('[ClientQuestionnaire] Network error/offline - loading questions from translations after error');
        // Try to load saved form data if we have uuid
        if (uuid) {
          const savedData = await getFormDataLocally(uuid);
          if (savedData) {
            setFormData(savedData);
          }
        }
        // Set pageData so questions can load from translations
        setPageData({ uuid: uuid || 'offline', page: currentIndex, offline: true });
        // Don't show error message in offline mode - it's working correctly
        // setError(''); // Clear error since offline mode is working
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to load page');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name, value) => {
    if (__DEV__) {
      console.log('[ClientQuestionnaire] Input change:', { name, value, type: typeof value, isArray: Array.isArray(value) });
    }
    setFormData({ [name]: value });
  };

  const handleNext = async () => {
    if (!pageData || visibleSectionQuestions.length === 0) return;

    // Validate that all required questions are answered
    if (!allQuestionsAnswered) {
      setError(currentLocale === 'kh' 
        ? 'សូមឆ្លើយសំណួរទាំងអស់មុនពេលបន្ត' 
        : 'Please answer all questions before continuing');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const connected = await isConnected();
      const submitData = {
        ...formData,
        locale: currentLocale,
        _uri: uuid,
      };

      let sectionIndex = currentIndex;
      if (!sectionIndex || sectionIndex === 'consent') {
        sectionIndex = 'consent';
      }

      if (__DEV__) {
        console.log('[ClientQuestionnaire] Submitting data:', {
          sectionIndex,
          submitData,
          formDataKeys: Object.keys(formData),
          uuid
        });
      }

      if (connected) {
        let response;
        try {
          response = await questionnaireAPI.saveClientPage(
            token,
            sectionIndex,
            submitData
          );
        } catch (saveError) {
          // Check if it's a network error
          if (isNetworkError(saveError)) {
            console.log('[ClientQuestionnaire] Network error while saving, falling back to offline mode:', {
              message: saveError.message,
              code: saveError.code,
            });
            // Fall through to offline mode handling
            // Don't throw, just proceed to offline queue
          } else {
            // Re-throw other errors
            throw saveError;
          }
        }
        
        // If we got a response, process it normally
        if (response && response.data && response.data.redirect) {
          const redirectPath = response.data.redirect;
          const pathParts = redirectPath.split('/');
          const newIndex = pathParts[pathParts.length - 1];
          
          if (newIndex === 'thank') {
            navigation.navigate('ThankYou');
          } else {
            setCurrentSession(token, uuid, newIndex);
            navigation.replace('ClientQuestionnaire', {
              token,
              locale: currentLocale,
              uuid,
              index: newIndex,
            });
          }
          setSaving(false);
          return;
        }
        // If no response (network error), fall through to offline mode
      }
      
      // Offline mode or network error: save to queue and navigate to next section
      await addToOfflineQueue({
        type: 'client',
        token,
        index: sectionIndex,
        data: submitData,
      });

      // Save form data locally
      await saveFormDataLocally(uuid, formData);

      // Manually navigate to next section when offline
      const currentIdx = SECTION_ORDER.indexOf(sectionIndex);
      if (currentIdx >= 0 && currentIdx < SECTION_ORDER.length - 1) {
        const nextIndex = SECTION_ORDER[currentIdx + 1];
        setCurrentSession(token, uuid, nextIndex);
        navigation.replace('ClientQuestionnaire', {
          token,
          locale: currentLocale,
          uuid,
          index: nextIndex,
        });
      } else {
        // Last section - navigate directly to thank you screen (no alert)
        navigation.navigate('ThankYou');
      }
    } catch (error) {
      console.error('[ClientQuestionnaire] Error saving:', {
        message: error.message,
        code: error.code,
        isNetworkError: isNetworkError(error),
        status: error.response?.status,
      });
      
      // Check if it's a network error
      const hasNetworkError = isNetworkError(error);
      
      if (hasNetworkError) {
        // Network error: save to offline queue and continue
        console.log('[ClientQuestionnaire] Network error while saving, saving to offline queue');
        try {
          await addToOfflineQueue({
            type: 'client',
            token,
            index: currentIndex,
            data: {
              ...formData,
              locale: currentLocale,
              _uri: uuid,
            },
          });
          await saveFormDataLocally(uuid, formData);
          
          // Navigate to next section
          const currentIdx = SECTION_ORDER.indexOf(currentIndex);
          if (currentIdx >= 0 && currentIdx < SECTION_ORDER.length - 1) {
            const nextIndex = SECTION_ORDER[currentIdx + 1];
            setCurrentSession(token, uuid, nextIndex);
            navigation.replace('ClientQuestionnaire', {
              token,
              locale: currentLocale,
              uuid,
              index: nextIndex,
            });
          } else {
            navigation.navigate('ThankYou');
          }
        } catch (queueError) {
          console.error('[ClientQuestionnaire] Error saving to offline queue:', queueError);
          setError(currentLocale === 'kh' 
            ? 'មិនអាចរក្សាទុកទិន្នន័យបានទេ។ សូមព្យាយាមម្តងទៀត។' 
            : 'Failed to save data. Please try again.');
        }
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to save data');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleBack = () => {
    if (currentIndex === 'consent') {
      // If we can go back, do so. Otherwise navigate to QRScanner
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('QRScanner');
      }
    } else {
      const currentIdx = SECTION_ORDER.indexOf(currentIndex);
      if (currentIdx > 0) {
        const prevIndex = SECTION_ORDER[currentIdx - 1];
        navigation.replace('ClientQuestionnaire', {
          token,
          locale: currentLocale,
          uuid,
          index: prevIndex,
        });
      } else {
        // Go back to consent or QRScanner if no history
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('QRScanner');
        }
      }
    }
  };

  const surveyTitle = currentLocale === 'kh' 
    ? 'កម្រងសំណួរព័ត៌មានត្រឡប់សម្រាប់អ្នកជំងឺ (PSF)'
    : 'Health Feedback Survey';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.loadingText, { fontFamily: theme.fontFamily.default }]}>
              {currentLocale === 'kh' ? 'កំពុងផ្ទុក...' : 'Loading...'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!pageData || visibleSectionQuestions.length === 0) {
    const emptyCopy = currentLocale === 'kh'
      ? 'មិនមានសំណួរ ឬផ្ទុកមិនបាន។ សូមពិនិត្យការតភ្ជាប់ ឬត្រលប់ក្រោយ។'
      : 'No questions or failed to load. Check your connection or go back.';
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <View style={styles.emptyStateIconWrap}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
            <Ionicons name="help-circle" size={28} color={COLORS.textSecondary} style={styles.emptyStateIconOverlay} />
          </View>
          <Text style={[styles.emptyStateText, { fontFamily: theme.fontFamily.default }]}>{emptyCopy}</Text>
          <View style={styles.emptyStateButtons}>
            <TouchableOpacity style={styles.button} onPress={loadPage} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={currentLocale === 'kh' ? 'ព្យាយាមម្តងទៀត' : 'Try again'}>
              <Text style={[styles.buttonText, { fontFamily: theme.fontFamily.default }]}>
                {currentLocale === 'kh' ? 'ព្យាយាមម្តងទៀត' : 'Try Again'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleBack} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={currentLocale === 'kh' ? 'ត្រលប់ក្រោយ' : 'Go back'}>
              <Text style={[styles.buttonTextSecondary, { fontFamily: theme.fontFamily.default }]}>
                {currentLocale === 'kh' ? 'ត្រលប់ក្រោយ' : 'Go Back'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header Bar with Enhanced Progress and step dots */}
      <LinearGradient
        colors={[COLORS.primaryLight, COLORS.secondaryBackground]}
        style={styles.headerBar}
      >
        <TouchableOpacity 
          style={styles.headerNavButton}
          onPress={handleBack}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={currentLocale === 'kh' ? 'ត្រលប់' : 'Previous'}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          <Text style={[styles.headerNavLabel, { fontFamily: theme.fontFamily.semiBold }]}>
            {currentLocale === 'kh' ? 'ត្រលប់' : 'Previous'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
            <Text style={[styles.progressText, { fontFamily: theme.fontFamily.bold }]}>
              {currentQuestionNumber} {currentLocale === 'kh' ? 'នៃ' : 'of'} {totalQuestions}
            </Text>
          </View>
          <View style={styles.stepDotsWrap}>
            <StepDots
              total={totalQuestions}
              currentIndex={currentSectionIndex >= 0 ? currentSectionIndex : 0}
              size={isTablet ? 20 : 18}
              gap={isTablet ? 8 : 6}
              completedColor={COLORS.primary}
              currentColor={COLORS.primaryDark}
              currentBorderColor={COLORS.primary}
              upcomingColor={COLORS.border}
            />
          </View>
          <View style={styles.progressBarContainer}>
            <AnimatedProgressBar
              progress={progress}
              duration={350}
              height={isTablet ? 8 : 6}
              borderRadius={isTablet ? 4 : 3}
              fillColor={COLORS.primary}
              backgroundColor={COLORS.secondaryBackground}
            />
          </View>
          <Text style={[styles.progressPercentage, { fontFamily: theme.fontFamily.default }]}>
            {Math.round(progress)}%
          </Text>
          {milestoneMessage ? (
            <View style={styles.milestoneBanner}>
              <Ionicons name="heart" size={16} color={COLORS.primary} />
              <Text style={[styles.milestoneText, { fontFamily: theme.fontFamily.default }]} numberOfLines={1}>
                {milestoneMessage}
              </Text>
            </View>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={[styles.headerNavButton, styles.headerNavButtonNext, (!allQuestionsAnswered || saving) && styles.headerNavButtonDisabled]}
          onPress={handleNext}
          disabled={!allQuestionsAnswered || saving}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={currentLocale === 'kh' ? 'បន្ត' : 'Next'}
        >
          <Text style={[styles.headerNavLabel, styles.headerNavLabelNext, { fontFamily: theme.fontFamily.semiBold }, (!allQuestionsAnswered || saving) && { color: COLORS.textSecondary }]}>
            {currentLocale === 'kh' ? 'បន្ត' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={22} color={(!allQuestionsAnswered || saving) ? COLORS.textSecondary : COLORS.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
      >
        <Animated.View
          style={{
            opacity: sectionEntranceOpacity,
            transform: [{ translateY: sectionEntranceTranslateY }],
          }}
        >
        {/* Section Title Card with Icon */}
        {sectionTitle && (
          <View style={styles.sectionTitleCard}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name={getSectionIcon(currentIndex)} size={isTablet ? 32 : 28} color={COLORS.primary} />
            </View>
            <View style={styles.sectionTitleContent}>
              <Text style={[styles.sectionTitle, { fontFamily: theme.fontFamily.bold }]}>
                {sectionTitle}
              </Text>
            </View>
          </View>
        )}

        {/* Section Content Card - For consent, show acknowledge text like web version */}
        {sectionContent && currentIndex === 'consent' && (
          <View style={styles.acknowledgeCard}>
            <Text style={[styles.acknowledgeText, { fontFamily: theme.fontFamily.default }]}>
              {replaceBrTags(sectionContent)}
            </Text>
          </View>
        )}
        
        {/* Section Content Card - For other sections */}
        {sectionContent && currentIndex !== 'consent' && (
          <View style={styles.sectionContentCard}>
            <Text style={[styles.sectionContent, { fontFamily: theme.fontFamily.default }]}>
              {sectionContent}
            </Text>
          </View>
        )}

        {/* All Questions in Section */}
        {visibleSectionQuestions.map((question, idx) => {
          // For consent section, don't show question title if sectionContent already shows it
          const shouldShowQuestionTitle = currentIndex !== 'consent' || !sectionContent;
          
          // Check if this question is answered
          const isQuestionAnswered = question.type === 'checkbox' 
            ? question.options.some(opt => {
                const fieldName = `${question.name}_${opt.value}`;
                return formData[fieldName] === '1' || formData[fieldName] === 1;
              })
            : formData[question.name] !== undefined && formData[question.name] !== null && formData[question.name] !== '';
          
          return (
            <View key={question.name || idx} style={styles.questionCard}>
              {shouldShowQuestionTitle && (
                <View style={styles.questionHeader}>
                  <View style={[styles.questionNumberBadge, isQuestionAnswered && styles.questionNumberBadgeCompleted]}>
                    {isQuestionAnswered ? (
                      <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    ) : (
                      <Text style={[styles.questionNumber, { fontFamily: theme.fontFamily.bold }]}>
                        {idx + 1}
                      </Text>
                    )}
                  </View>
                  <View style={styles.questionTitleContainer}>
                    <Text style={[styles.questionTitle, { fontFamily: theme.fontFamily.bold }]}>
                      {replaceBrTags(question.text || question.label || '')}
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.answerArea}>
                <QuestionComponent
                  question={question}
                  value={formData[question.name]}
                  onChange={(fieldName, fieldValue) => {
                    // Handle checkbox fields: fieldName is like "q3c_1", fieldValue is "1" or undefined
                    // For regular fields: fieldName is question.name, fieldValue is the actual value
                    if (question.type === 'checkbox' && fieldName && fieldName.includes('_')) {
                      // Checkbox: update individual field (e.g., q3c_1 = "1")
                      handleInputChange(fieldName, fieldValue);
                    } else {
                      // Radio/Text: update question field (e.g., q1a = "1")
                      handleInputChange(question.name, fieldValue !== undefined ? fieldValue : fieldName);
                    }
                  }}
                  locale={currentLocale}
                  formData={formData}
                />
              </View>
            </View>
          );
        })}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.errorAlt} />
            <Text style={[styles.errorText, { fontFamily: theme.fontFamily.default }]}>
              {error}
            </Text>
          </View>
        )}
        </Animated.View>
      </ScrollView>

      {/* Navigation Bar */}
      <View style={styles.navigationBar}>
        <Animated.View style={{ transform: [{ scale: nextButtonScale }] }}>
          <TouchableOpacity
            style={[
              styles.nextButtonWrap,
              (!allQuestionsAnswered || saving) && styles.nextButtonDisabled
            ]}
            onPress={handleNext}
            disabled={!allQuestionsAnswered || saving}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={allQuestionsAnswered 
              ? (currentLocale === 'kh' ? 'បន្ត' : 'Continue') 
              : (currentLocale === 'kh' ? 'បន្ត' : 'Next')}
            accessibilityState={{ disabled: !allQuestionsAnswered || saving }}
          >
            <LinearGradient
            colors={(!allQuestionsAnswered || saving) ? [COLORS.border, COLORS.border] : [COLORS.primary, COLORS.primaryDark]}
            style={styles.nextButton}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={[styles.nextButtonText, { fontFamily: theme.fontFamily.bold }]}>
                  {allQuestionsAnswered 
                    ? (currentLocale === 'kh' ? 'បន្ត' : 'Continue')
                    : (currentLocale === 'kh' ? 'បន្ត' : 'Next')}
                </Text>
                <Ionicons name={allQuestionsAnswered ? "rocket" : "arrow-forward"} size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
              </>
            )}
          </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (isTablet, locale) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isTablet ? 40 : 20,
  },
  emptyStateIconWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  emptyStateIconOverlay: {
    position: 'absolute',
    right: -4,
    bottom: -4,
  },
  emptyStateText: {
    fontSize: isTablet ? 17 : 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyStateButtons: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginTop: 10,
  },
  buttonTextSecondary: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isTablet ? 32 : 20,
    paddingVertical: isTablet ? 20 : 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.secondaryBackground,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepDotsWrap: {
    marginBottom: 8,
  },
  headerButton: {
    width: isTablet ? 48 : 44,
    height: isTablet ? 48 : 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: COLORS.secondaryBackground,
  },
  headerNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isTablet ? 14 : 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.secondaryBackground,
    gap: 4,
  },
  headerNavButtonNext: {
    backgroundColor: COLORS.primary,
  },
  headerNavButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  headerNavLabel: {
    fontSize: isTablet ? 15 : 14,
    color: COLORS.text,
  },
  headerNavLabelNext: {
    color: COLORS.white,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: isTablet ? 24 : 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  progressText: {
    fontSize: isTablet ? 19 : 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 6,
  },
  progressPercentage: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  milestoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.shadow,
    borderRadius: 8,
    maxWidth: '100%',
  },
  milestoneText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: isTablet ? 32 : 20,
    paddingTop: isTablet ? 32 : 24,
    paddingBottom: 120,
  },
  sectionTitleCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 28 : 20,
    marginBottom: isTablet ? 24 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionIconContainer: {
    width: isTablet ? 64 : 56,
    height: isTablet ? 64 : 56,
    borderRadius: isTablet ? 32 : 28,
    backgroundColor: COLORS.selectedBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isTablet ? 20 : 16,
  },
  sectionTitleContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: isTablet ? 32 : 28,
  },
  sectionContentCard: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: isTablet ? 16 : 12,
    padding: isTablet ? 20 : 16,
    marginBottom: isTablet ? 28 : 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionContent: {
    fontSize: isTablet ? 17 : 15,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: isTablet ? 26 : 22,
  },
  acknowledgeCard: {
    marginBottom: isTablet ? 24 : 20,
    paddingHorizontal: isTablet ? 4 : 0,
  },
  acknowledgeText: {
    fontSize: isTablet ? 17 : 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: isTablet ? 28 : 24,
    textAlign: 'left',
  },
  questionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: isTablet ? 20 : 18,
    padding: isTablet ? 28 : 24,
    marginBottom: isTablet ? 28 : 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: isTablet ? 18 : 16,
  },
  questionNumberBadge: {
    width: isTablet ? 40 : 36,
    height: isTablet ? 40 : 36,
    borderRadius: isTablet ? 20 : 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isTablet ? 16 : 14,
    marginTop: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  questionNumberBadgeCompleted: {
    backgroundColor: COLORS.success,
  },
  questionNumber: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  questionTitleContainer: {
    flex: 1,
  },
  questionTitle: {
    fontSize: isTablet ? 20 : 17,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: isTablet ? 30 : 26,
    letterSpacing: 0.3,
  },
  answerArea: {
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: isTablet ? 15 : 14,
    color: COLORS.errorText,
  },
  navigationBar: {
    paddingHorizontal: isTablet ? 32 : 20,
    paddingVertical: isTablet ? 20 : 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 2,
    borderTopColor: COLORS.secondaryBackground,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonWrap: {
    borderRadius: isTablet ? 16 : 14,
    overflow: 'hidden',
    minHeight: isTablet ? 60 : 56,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  nextButton: {
    paddingVertical: isTablet ? 20 : 18,
    borderRadius: isTablet ? 16 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isTablet ? 60 : 56,
    flexDirection: 'row',
  },
  nextButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    fontSize: isTablet ? 20 : 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: isTablet ? 16 : 14,
    paddingHorizontal: isTablet ? 32 : 24,
    borderRadius: isTablet ? 14 : 12,
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: isTablet ? 20 : 16,
    fontSize: isTablet ? 18 : 15,
    color: COLORS.primaryDark,
    fontWeight: '500',
  },
});
