import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, appColors } from '../theme';
import { useAppStore } from '../store/useAppStore';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const COLORS = appColors;

// Map answer values to emotion icons (3D style)
const getEmotionIcon = (option, isSelected) => {
  const valueStr = String(option.value);
  const label = String(option.label || option.text || '').toLowerCase();
  const key = String(option.key || '').toLowerCase();
  
  // Khmer: check raw text first (negative before positive)
  const rawLabel = String(option.label || option.text || '')
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
    .trim();
  const hasKhmerNo = /មិនយល/.test(rawLabel) || /មិនពេញចិត្ត/.test(rawLabel);
  const hasKhmerYes = (/យល់ព្រម/.test(rawLabel) || /ពេញចិត្ត/.test(rawLabel)) && !hasKhmerNo;
  
  // Check if this is a positive answer (Yes, Satisfied, Agree, Acknowledge)
  const isPositive = hasKhmerYes ||
                     label.includes('satisfied') || 
                     label.includes('yes') || 
                     label.includes('agree') || 
                     label.includes('acknowledge') ||
                     key.includes('q1a_3') || // Satisfied key
                     key.includes('yesno_1'); // Yes key
  
  // Check if this is a negative answer (No, Unsatisfied, Disagree)
  const isNegative = hasKhmerNo ||
                      label.includes('unsatisfied') || 
                      label.includes('no') || 
                      label.includes('disagree') ||
                      key.includes('q1a_1') || // Unsatisfied key
                      key.includes('yesno_2'); // No key
  
  // Determine emotion based on value and label
  // Value '3' = Satisfied (always happy)
  if (valueStr === '3') {
    return { type: 'emoji', emoji: '😊', icon: 'thumbs-up', color: COLORS.primary, bgColor: COLORS.selectedBg };
  }
  // Value '1' = Could be Yes/Acknowledge (happy) or Unsatisfied (sad) - check label/key
  if (valueStr === '1') {
    if (isPositive) {
      return { type: 'emoji', emoji: '😊', icon: 'thumbs-up', color: COLORS.primary, bgColor: COLORS.selectedBg };
    } else if (isNegative) {
      return { type: 'emoji', emoji: '😢', icon: 'thumbs-down', color: COLORS.error, bgColor: COLORS.errorBg };
    }
    // Default for '1' if unclear - assume positive
    return { type: 'emoji', emoji: '😊', icon: 'thumbs-up', color: COLORS.primary, bgColor: COLORS.selectedBg };
  }
  // Value '0' = No/Disagree (sad)
  if (valueStr === '0') {
    return { type: 'emoji', emoji: '😢', icon: 'thumbs-down', color: COLORS.error, bgColor: COLORS.errorBg };
  }
  // Value '2' = Neutral / ធម្មតា (Normal)
  if (valueStr === '2') {
    return { type: 'emoji', emoji: '🙂', icon: 'remove-circle', color: COLORS.warning, bgColor: COLORS.warningBg };
  }
  // Value '98' or '99' = សុំមិនឆ្លើយ (Rather not say) / Don't know
  if (valueStr === '98' || valueStr === '99') {
    return { type: 'emoji', emoji: '🫢', icon: 'help-circle', color: COLORS.textSecondary, bgColor: COLORS.neutralBg };
  }
  
  // Default - ALWAYS return emoji (never icon for radio buttons)
  // If value is unclear, use neutral emoji
  return { type: 'emoji', emoji: '😐', icon: 'ellipse-outline', color: COLORS.warning, bgColor: COLORS.warningBg };
};

// Provider answer keys → emoji (so provider Yes/No and scales match consistently)
const PROVIDER_EMOJI_BY_KEY = {
  yesno_1: '😊', yesno_2: '😢',
  d1_1: '🎗️', d1_2: '🤰🏻', d1_3: '🦠', d1_4: '🧪', d1_5: '💉', d1_6: '😷', d1_99: '📋',  // ART, ANC, STI, Lab, Mental/Drug, TB, Other
  e1_1: '😊', e1_2: '😢', e1_98: '🫢',
  e2_1: '😊', e2_2: '😢', e2_98: '🫢',
  e3_1: '😊', e3_2: '😢', e3_98: '🫢', e3_99: '🫢',
  e4_1: '😟', e4_2: '🙂', e4_3: '😊', e4_4: '🫢',  // Very worried → Not worried / N/A
  e5_1: '😊', e5_2: '😐', e5_3: '😢',                 // Strongly agree → Disagree → Strongly disagree
  e6_1: '😢', e6_2: '😐', e6_3: '🙂', e6_4: '😊', e6_5: '😊',  // Very low → Very high
};
const PROVIDER_KEYS = Object.keys(PROVIDER_EMOJI_BY_KEY);

// Get emoji for an option (used for both radio and checkbox). Handles client + provider keys.
function getDisplayEmojiForOption(option) {
  const key = String(option.key || '').trim();
  const keyLower = key.toLowerCase();
  // Provider: use explicit key mapping so emoji matches answer
  const providerKey = PROVIDER_KEYS.find(k => k.toLowerCase() === keyLower);
  if (providerKey) return PROVIDER_EMOJI_BY_KEY[providerKey];
  const valueStr = String(option.value);
  const rawLabel = String(option.label || option.text || '')
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
    .trim();
  const label = rawLabel.toLowerCase();
  const hasKhmerNo = /មិនយល/.test(rawLabel) || /មិនពេញចិត្ត/.test(rawLabel);
  const hasKhmerYes = (/យល់ព្រម/.test(rawLabel) || /ពេញចិត្ត/.test(rawLabel)) && !hasKhmerNo;
  if (valueStr === '3') return '😊';
  if (valueStr === '1') {
    if (hasKhmerNo || label.includes('unsatisfied') || label.includes('no') || label.includes('disagree') || keyLower.includes('q1a_1') || keyLower === 'yesno_2') return '😢';
    return '😊';
  }
  if (valueStr === '0') return '😢';
  // Value '2': in provider yesno_2/e1_2/e2_2/e3_2 = No (handled above by key); in client = Neutral
  if (valueStr === '2') {
    if (keyLower === 'yesno_2' || keyLower === 'e1_2' || keyLower === 'e2_2' || keyLower === 'e3_2' || label.includes('no')) return '😢';
    return '🙂';
  }
  if (valueStr === '98' || valueStr === '99') return '🫢';
  return '😐';
}

// Animated option card: scale down on press (0.98), selected state 1.02
function AnimatedOptionButton({ isSelected, style, onPress, children, accessibilityLabel, accessibilityState }) {
  const scale = useRef(new Animated.Value(isSelected ? 1.02 : 1)).current;
  useEffect(() => {
    Animated.timing(scale, { toValue: isSelected ? 1.02 : 1, duration: 200, useNativeDriver: true }).start();
  }, [isSelected]);
  const handlePressIn = () => Animated.timing(scale, { toValue: 0.98, duration: 80, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.timing(scale, { toValue: isSelected ? 1.02 : 1, duration: 200, useNativeDriver: true }).start();
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

export default function QuestionComponent({ question, value, onChange, locale: propLocale, formData: parentFormData }) {
  const { locale: storeLocale } = useAppStore();
  const locale = propLocale || storeLocale || 'en';
  const styles = createStyles(isTablet, locale);

  // Helper function to replace <br> tags with newlines
  const replaceBrTags = (text) => {
    if (!text) return '';
    return String(text).replace(/<br\s*\/?>/gi, '\n');
  };

    if (!question) return null;

    const questionText = question.text || question.label || '';
    const questionType = question.type || 'radio';
    const options = question.options || [];
    // Use parent formData if provided, otherwise fallback to value prop
    const formData = parentFormData || {};

    return (
    <View style={styles.container}>
        {questionType === 'radio' && options.length > 0 && (
          <View style={styles.optionsContainer}>
          {options.map((option, idx) => {
            const isSelected = value === option.value;
            const displayEmoji = getDisplayEmojiForOption(option);
            return (
              <AnimatedOptionButton
                key={idx}
                isSelected={isSelected}
                style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                onPress={() => onChange(option.value)}
                accessibilityLabel={replaceBrTags(option.label || option.text)}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.optionContent}>
                  <Text 
                    style={styles.emojiIcon} 
                    numberOfLines={1} 
                    allowFontScaling={true}
                    suppressHighlighting={true}
                  >
                    {displayEmoji}
                  </Text>
                  <View style={styles.textContainer}>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                        { fontFamily: theme.fontFamily.default },
                      ]}
                      includeFontPadding={false}
                    >
                      {replaceBrTags(option.label || option.text)}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.optionCheckRight}>
                      <Ionicons name="checkmark-circle" size={isTablet ? 28 : 24} color={COLORS.primary} />
                    </View>
                  )}
                </View>
              </AnimatedOptionButton>
            );
          })}
          </View>
        )}

        {questionType === 'checkbox' && options.length > 0 && (
          <View style={styles.optionsContainer}>
            {options.map((option, idx) => {
              const fieldName = `${question.name}_${option.value}`;
              const isChecked = formData?.[fieldName] === '1' || formData?.[fieldName] === 1;
              const optionEmoji = getDisplayEmojiForOption(option);

              return (
                <AnimatedOptionButton
                  key={idx}
                  isSelected={isChecked}
                  style={[styles.optionButton, isChecked && styles.optionButtonSelected]}
                  onPress={() => {
                    const newValue = isChecked ? undefined : '1';
                    if (onChange) onChange(fieldName, newValue);
                  }}
                  accessibilityLabel={replaceBrTags(option.label || option.text)}
                  accessibilityState={{ checked: isChecked }}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.emojiIcon} numberOfLines={1} suppressHighlighting={true}>
                      {optionEmoji}
                    </Text>
                    <View style={styles.textContainer}>
                      <Text
                        style={[
                          styles.optionText,
                          isChecked && styles.optionTextSelected,
                          { fontFamily: theme.fontFamily.default },
                        ]}
                        includeFontPadding={false}
                      >
                        {replaceBrTags(option.label || option.text)}
                      </Text>
                    </View>
                    <View style={styles.checkboxContainer}>
                      <View style={[styles.checkbox, isChecked && styles.checkboxSelected]}>
                        {isChecked && <Ionicons name="checkmark" size={18} color={COLORS.white} />}
                      </View>
                    </View>
                  </View>
                </AnimatedOptionButton>
              );
            })}
          </View>
        )}

        {questionType === 'text' && (
          <TextInput
          style={[styles.textInput, { fontFamily: theme.fontFamily.default }]}
            value={value || ''}
            onChangeText={onChange}
          placeholder={locale === 'kh' ? 'វាយបញ្ចូល...' : 'Type your feedback here...'}
          placeholderTextColor={COLORS.textSecondary}
            multiline={question.multiline}
          textAlignVertical={question.multiline ? 'top' : 'center'}
          />
        )}

        {questionType === 'number' && (
          <TextInput
          style={[styles.textInput, { fontFamily: theme.fontFamily.default }]}
            value={value || ''}
            onChangeText={onChange}
            keyboardType="numeric"
            placeholder={locale === 'kh' ? 'វាយបញ្ចូលលេខ...' : 'Enter number...'}
          placeholderTextColor={COLORS.textSecondary}
          />
        )}
      </View>
    );
}

const createStyles = (isTablet, locale) => StyleSheet.create({
  container: {
    width: '100%',
  },
  optionsContainer: {
    gap: 0,
  },
  optionButton: {
    paddingVertical: isTablet ? 20 : 18,
    paddingHorizontal: isTablet ? 24 : 20,
    backgroundColor: COLORS.background,
    borderRadius: isTablet ? 18 : 16,
    borderWidth: 2.5,
    borderColor: COLORS.border,
    marginBottom: isTablet ? 16 : 14,
    minHeight: isTablet ? 68 : 64,
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.selectedBg,
    borderWidth: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
    width: '100%',
    flex: 1,
  },
  optionCheckRight: {
    marginLeft: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginLeft: 12,
  },
  emotionIconWrapper: {
    width: isTablet ? 48 : 44,
    height: isTablet ? 48 : 44,
    borderRadius: isTablet ? 24 : 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadowBlack,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  emotionIconWrapperSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  emojiIcon: {
    fontSize: isTablet ? 44 : 40,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: isTablet ? 44 : 40,
    backgroundColor: 'transparent',
    minWidth: isTablet ? 44 : 40,
    minHeight: isTablet ? 44 : 40,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  optionText: {
    flex: 1,
    fontSize: isTablet ? 18 : 16,
    lineHeight: isTablet ? 26 : 24,
    color: COLORS.text,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlignVertical: 'center',
  },
  optionTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  checkboxContainer: {
    marginLeft: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: isTablet ? 30 : 28,
    height: isTablet ? 30 : 28,
    borderRadius: isTablet ? 8 : 7,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: isTablet ? 16 : 14,
    padding: isTablet ? 18 : 16,
    fontSize: isTablet ? 18 : 16,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    minHeight: isTablet ? 60 : 56,
    fontFamily: theme.fontFamily.default,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
