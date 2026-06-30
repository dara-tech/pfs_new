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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { questionnaireAPI, isConnected, isNetworkError } from '../../services/api';
import { addToOfflineQueue, saveFormDataLocally, getFormDataLocally } from '../../utils/offlineStorage';
import { t } from '../../translations';
import QuestionComponent from '../../components/QuestionComponent';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import StepDots from '../../components/StepDots';
import { getProviderQuestionsForSection, getProviderSectionTitle, getProviderSectionContent } from '../../utils/questionHelper';
import { theme, appColors } from '../../theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const PROVIDER_SECTION_ORDER = ['consent', 'section1'];
const COLORS = appColors;

export default function ProviderQuestionnaireScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, locale: routeLocale, uuid, index } = route.params || {};
  const { locale, formData, setFormData, setCurrentSession } = useAppStore();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentLocale = routeLocale || locale || 'kh';
  const currentIndex = index || 'consent';
  const styles = createStyles(isTablet, currentLocale);

  const currentSectionIndex = PROVIDER_SECTION_ORDER.indexOf(currentIndex);
  const currentStep = currentSectionIndex >= 0 ? currentSectionIndex + 1 : 1;
  const totalSteps = PROVIDER_SECTION_ORDER.length;
  const progress = currentSectionIndex >= 0 ? ((currentSectionIndex + 1) / totalSteps) * 100 : 0;

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

  // Helper function to replace <br> tags with newlines
  const replaceBrTags = (text) => {
    if (!text) return '';
    return String(text).replace(/<br\s*\/?>/gi, '\n');
  };

  // Get questions for current section from translations
  // Always load from translations (works offline), pageData just needs to be truthy for rendering
  const sectionQuestions = getProviderQuestionsForSection(currentIndex, currentLocale);
  
  // Debug logging
  useEffect(() => {
    console.log('[ProviderQuestionnaire] Section questions:', {
      currentIndex,
      questionCount: sectionQuestions.length,
      questions: sectionQuestions.map(q => q.name)
    });
  }, [currentIndex, sectionQuestions.length]);

  useEffect(() => {
    loadPage();
  }, [token, currentLocale, uuid, currentIndex]);

  // Set default consent to "Yes" when on consent page
  useEffect(() => {
    if (pageData && currentIndex === 'consent' && formData.consent === undefined) {
      setFormData({ consent: '1' });
    }
  }, [pageData, currentIndex]);

  // Check if all questions in section are answered
  const allQuestionsAnswered = sectionQuestions.every(q => {
    if (q.type === 'checkbox') {
      // For checkbox questions, check if at least one option is selected
      return q.options.some(opt => {
        const fieldName = `${q.name}_${opt.value}`;
        return formData[fieldName] === '1' || formData[fieldName] === 1;
      });
    }
    const value = formData[q.name];
    return value !== undefined && value !== null && value !== '';
  });

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
        console.log('[ProviderQuestionnaire] Offline mode - loading questions from translations', {
          currentIndex,
          uuid,
          token
        });
        // Try to load saved form data if we have uuid
        if (uuid) {
          const savedData = await getFormDataLocally(uuid);
          if (savedData) {
            console.log('[ProviderQuestionnaire] Loaded saved form data:', Object.keys(savedData));
            setFormData(savedData);
          }
        }
        // Create a minimal pageData structure for offline mode
        // Questions will be loaded from translations via getProviderQuestionsForSection
        // Set pageData so questions can render
        setPageData({ uuid: uuid || 'offline', page: currentIndex, offline: true });
        console.log('[ProviderQuestionnaire] Set pageData for offline mode, questions count:', 
          getProviderQuestionsForSection(currentIndex, currentLocale).length
        );
        setLoading(false);
        return;
      }

      // Only pass index if we have a uuid (for subsequent pages)
      // On first load (no uuid), don't pass index to get initial UUID
      let response;
      try {
        response = await questionnaireAPI.getProviderPage(
          token,
          currentLocale,
          uuid,
          uuid ? currentIndex : undefined
        );
      } catch (apiError) {
        // Check if it's a network error
        if (isNetworkError(apiError)) {
          console.log('[ProviderQuestionnaire] Network error detected, falling back to offline mode:', {
            message: apiError.message,
            code: apiError.code,
          });
          // Fall through to offline mode handling
          throw { ...apiError, isNetworkError: true };
        }
        // Re-throw other errors
        throw apiError;
      }

      if (response.data) {
        setPageData(response.data);

        if (response.data.uuid && !uuid) {
          setCurrentSession(token, response.data.uuid, 'consent');
          navigation.replace('ProviderQuestionnaire', {
            token,
            locale: currentLocale,
            uuid: response.data.uuid,
            index: 'consent',
          });
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
      console.error('[ProviderQuestionnaire] Error loading page:', {
        message: error.message,
        code: error.code,
        isNetworkError: error.isNetworkError,
        status: error.response?.status,
      });
      
      // Check if it's a network error or if we're offline
      const connected = await isConnected();
      const hasNetworkError = error.isNetworkError || isNetworkError(error);
      
      // If offline or network error, load questions from translations (offline mode)
      if (!connected || hasNetworkError) {
        console.log('[ProviderQuestionnaire] Network error/offline - loading questions from translations after error', {
          currentIndex,
          uuid,
          error: error.message
        });
        // Try to load saved form data if we have uuid
        if (uuid) {
          const savedData = await getFormDataLocally(uuid);
          if (savedData) {
            setFormData(savedData);
          }
        }
        // Set pageData so questions can load from translations
        setPageData({ uuid: uuid || 'offline', page: currentIndex, offline: true });
        const questionCount = getProviderQuestionsForSection(currentIndex, currentLocale).length;
        console.log('[ProviderQuestionnaire] Set pageData after error, questions count:', questionCount);
        setError(currentLocale === 'kh' 
          ? 'មិនមានការតភ្ជាប់។ កំពុងប្រើទិន្នន័យដែលបានរក្សាទុក។' 
          : 'No connection. Using saved data.');
      } else {
        setError(error.response?.data?.error || error.message || 'Failed to load page');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData({ [name]: value });
  };

  const handleSubmit = async () => {
    if (!pageData) return;

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

      if (connected) {
        let response;
        try {
          response = await questionnaireAPI.saveProviderPage(
            token,
            sectionIndex,
            submitData
          );
        } catch (saveError) {
          // Check if it's a network error
          if (isNetworkError(saveError)) {
            console.log('[ProviderQuestionnaire] Network error while saving, falling back to offline mode:', {
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
            navigation.replace('ProviderQuestionnaire', {
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
        type: 'provider',
        token,
        index: sectionIndex,
        data: submitData,
      });

      // Save form data locally
      await saveFormDataLocally(uuid, formData);

      // Manually navigate to next section when offline
      // Provider sections: consent -> section1 -> thank
      if (sectionIndex === 'consent') {
        // After consent, go to section1
        setCurrentSession(token, uuid, 'section1');
        navigation.replace('ProviderQuestionnaire', {
          token,
          locale: currentLocale,
          uuid,
          index: 'section1',
        });
      } else if (sectionIndex === 'section1') {
        // After section1, navigate directly to thank you (no alert)
        navigation.navigate('ThankYou');
      } else {
        // Fallback: navigate to thank you
        navigation.navigate('ThankYou');
      }
    } catch (error) {
      console.error('[ProviderQuestionnaire] Error saving:', {
        message: error.message,
        code: error.code,
        isNetworkError: isNetworkError(error),
        status: error.response?.status,
      });
      
      // Check if it's a network error
      const hasNetworkError = isNetworkError(error);
      
      if (hasNetworkError) {
        // Network error: save to offline queue and continue
        console.log('[ProviderQuestionnaire] Network error while saving, saving to offline queue');
        try {
          await addToOfflineQueue({
            type: 'provider',
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
          if (currentIndex === 'consent') {
            setCurrentSession(token, uuid, 'section1');
            navigation.replace('ProviderQuestionnaire', {
              token,
              locale: currentLocale,
              uuid,
              index: 'section1',
            });
          } else {
            navigation.navigate('ThankYou');
          }
        } catch (queueError) {
          console.error('[ProviderQuestionnaire] Error saving to offline queue:', queueError);
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

  const handleBack = () => {
    if (currentIndex === 'consent') {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('QRScanner');
      }
    } else {
      setCurrentSession(token, uuid, 'consent');
      navigation.replace('ProviderQuestionnaire', {
        token,
        locale: currentLocale,
        uuid,
        index: 'consent',
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
<Text style={[styles.loadingText, { fontFamily: theme.fontFamily.default }]}>
            {currentLocale === 'kh' ? 'កំពុងផ្ទុក...' : 'Loading...'}
        </Text>
      </SafeAreaView>
    );
  }

  // Show questions even if pageData is minimal (offline mode)
  // Only show error if we have an error and no questions available
  if (!pageData && !error && sectionQuestions.length === 0) {
    const emptyCopy = currentLocale === 'kh'
      ? 'មិនមានសំណួរ ឬផ្ទុកមិនបាន។ សូមពិនិត្យការតភ្ជាប់ ឬត្រលប់ក្រោយ។'
      : 'No questions or failed to load. Check your connection or go back.';
    const handleGoBack = () => {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('QRScanner');
    };
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <View style={styles.emptyStateIconWrap}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
            <Ionicons name="help-circle" size={28} color={COLORS.textSecondary} style={styles.emptyStateIconOverlay} />
          </View>
          <Text style={[styles.emptyStateText, { fontFamily: theme.fontFamily.default }]}>{emptyCopy}</Text>
          <View style={styles.emptyStateButtons}>
            <TouchableOpacity style={styles.button} onPress={loadPage} accessibilityRole="button" accessibilityLabel={currentLocale === 'kh' ? 'ព្យាយាមម្តងទៀត' : 'Try again'}>
              <Text style={[styles.buttonText, { fontFamily: theme.fontFamily.default }]}>{currentLocale === 'kh' ? 'ព្យាយាមម្តងទៀត' : 'Try Again'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleGoBack} accessibilityRole="button" accessibilityLabel={currentLocale === 'kh' ? 'ត្រលប់ក្រោយ' : 'Go back'}>
              <Text style={[styles.buttonTextSecondary, { fontFamily: theme.fontFamily.default }]}>{currentLocale === 'kh' ? 'ត្រលប់ក្រោយ' : 'Go Back'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
              {currentStep} {currentLocale === 'kh' ? 'នៃ' : 'of'} {totalSteps}
            </Text>
          </View>
          <View style={styles.stepDotsWrap}>
            <StepDots
              total={totalSteps}
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
        </View>
        <TouchableOpacity
          style={[styles.headerNavButton, styles.headerNavButtonNext, (!allQuestionsAnswered || saving) && styles.headerNavButtonDisabled]}
          onPress={handleSubmit}
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
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
      >
        <Animated.View style={{ opacity: sectionEntranceOpacity, transform: [{ translateY: sectionEntranceTranslateY }] }}>
        {/* Section Title Card (match Client) */}
        {getProviderSectionTitle(currentIndex, currentLocale) && (
          <View style={styles.sectionTitleCard}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="document-text" size={isTablet ? 32 : 28} color={COLORS.primary} />
            </View>
            <View style={styles.sectionTitleContent}>
              <Text style={[styles.sectionTitle, { fontFamily: theme.fontFamily.bold }]}>
                {replaceBrTags(getProviderSectionTitle(currentIndex, currentLocale))}
              </Text>
            </View>
          </View>
        )}

        {/* Section Content Card */}
        {getProviderSectionContent(currentIndex, currentLocale) && (
          <View style={styles.sectionContentCard}>
            <Text style={[styles.sectionContent, { fontFamily: theme.fontFamily.default }]}>
              {replaceBrTags(getProviderSectionContent(currentIndex, currentLocale))}
            </Text>
          </View>
        )}

        {/* Section2 Title (show before e1 questions) */}
        {currentIndex === 'section1' && sectionQuestions.length > 1 && (
          <Text style={[styles.section2Title, { fontFamily: theme.fontFamily.bold }]}>
            {replaceBrTags(t(currentLocale, 'provider.questions.section2'))}
          </Text>
        )}

        {/* All Questions in Section - card layout like Client */}
        {sectionQuestions.length > 0 ? sectionQuestions.map((question, idx) => {
          const isQuestionAnswered = question.type === 'checkbox'
            ? question.options?.some(opt => formData[`${question.name}_${opt.value}`] === '1' || formData[`${question.name}_${opt.value}`] === 1)
            : formData[question.name] !== undefined && formData[question.name] !== null && formData[question.name] !== '';
          // Don't duplicate welcome/consent text: section content already shows it for consent
          const sectionContent = getProviderSectionContent(currentIndex, currentLocale);
          const shouldShowQuestionTitle = currentIndex !== 'consent' || !sectionContent;
          return (
          <View key={question.name || idx} style={styles.questionCard}>
            {shouldShowQuestionTitle && (
            <View style={styles.questionHeader}>
              <View style={[styles.questionNumberBadge, isQuestionAnswered && styles.questionNumberBadgeCompleted]}>
                {isQuestionAnswered ? (
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                ) : (
                  <Text style={[styles.questionNumber, { fontFamily: theme.fontFamily.bold }]}>{idx + 1}</Text>
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
                  // Handle checkbox fields
                  if (question.type === 'checkbox' && fieldName && fieldName.includes('_')) {
                    handleInputChange(fieldName, fieldValue);
                  } else {
                    // Radio/Text: update question field
                    handleInputChange(question.name, fieldValue !== undefined ? fieldValue : fieldName);
                  }
                }}
                locale={currentLocale}
                formData={formData}
              />
            </View>
          </View>
          );
        }) : (
          <View style={styles.questionCard}>
            <Text style={[styles.questionTitle, { fontFamily: theme.fontFamily.default }]}>
              {currentLocale === 'kh' 
                ? 'មិនមានសំណួរ។ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត។'
                : 'No questions found. Please check your internet connection.'}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.errorAlt} />
            <Text style={[styles.errorText, { fontFamily: theme.fontFamily.default }]}>{error}</Text>
          </View>
        )}

        </Animated.View>
      </ScrollView>

      {/* Navigation Bar - match Client */}
      <View style={styles.navigationBar}>
        <Animated.View style={{ transform: [{ scale: nextButtonScale }] }}>
          <TouchableOpacity
            style={[styles.nextButtonWrap, (!allQuestionsAnswered || saving) && styles.nextButtonDisabled]}
            onPress={handleSubmit}
            disabled={!allQuestionsAnswered || saving}
            accessibilityRole="button"
            accessibilityLabel={currentLocale === 'kh' ? 'បន្ត' : 'Continue'}
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
                    {currentLocale === 'kh' ? 'បន្ត' : 'Continue'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
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
  stepDotsWrap: {
    marginBottom: 8,
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
    fontFamily: theme.fontFamily.default,
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
    fontFamily: theme.fontFamily.default,
  },
  scrollView: {
    flex: 1,
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
    fontFamily: theme.fontFamily.default,
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
    fontFamily: theme.fontFamily.default,
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
    fontFamily: theme.fontFamily.default,
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
    fontFamily: theme.fontFamily.default,
  },
  section2Title: {
    fontSize: isTablet ? 18 : 17,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 24,
    marginBottom: 16,
    lineHeight: isTablet ? 26 : 24,
    fontFamily: theme.fontFamily.default,
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
    backgroundColor: COLORS.primary,
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
    fontFamily: theme.fontFamily.default,
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
    fontFamily: theme.fontFamily.default,
  },
  loadingText: {
    marginTop: 16,
    fontSize: isTablet ? 15 : 14,
    color: COLORS.textSecondary,
    fontFamily: theme.fontFamily.default,
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
    fontFamily: theme.fontFamily.default,
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
    fontFamily: theme.fontFamily.default,
  },
});
