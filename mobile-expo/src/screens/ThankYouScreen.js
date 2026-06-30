import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { theme, appColors } from '../theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const COLORS = appColors;

// Confetti piece configs: fixed seed for consistent look
const CONFETTI_COLORS = [COLORS.primary, COLORS.primaryLight, COLORS.primaryDark, COLORS.success, COLORS.textSecondary];
const CONFETTI_COUNT = 14;
const confettiPieces = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  id: i,
  left: (i * 37 + 11) % 90 + 5,
  delay: (i * 80) % 400,
  duration: 1200 + (i % 3) * 300,
  size: 6 + (i % 4),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

function ConfettiPiece({ left, delay, duration, size, color }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 200,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration * 0.7,
        delay: delay + duration * 0.3,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.confettiPiece,
        {
          left: `${left}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    />
  );
}

export default function ThankYouScreen() {
  const navigation = useNavigation();
  const { locale, clearFormData } = useAppStore();
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleHome = () => {
    clearFormData();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark-circle" size={isTablet ? 80 : 64} color={COLORS.success} />
          </Animated.View>
        </View>
        {/* Simple confetti - positioned above content, falling */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {confettiPieces.map((p) => (
            <ConfettiPiece key={p.id} {...p} />
          ))}
        </View>
        
        <Text style={[styles.thankYouText, { fontFamily: theme.fontFamily.bold }]}>
          {locale === 'kh' ? 'សូមអរគុណ!' : 'Thank You!'}
        </Text>
        
        <Text style={[styles.message, { fontFamily: theme.fontFamily.default }]}>
          {locale === 'kh'
            ? 'សូមអរគុណសម្រាប់មតិយោបល់របស់អ្នក។ មតិយោបល់របស់អ្នកនឹងជួយកែលម្អសេវាសុខាភិបាល។'
            : 'Thank you for your feedback. Your feedback will help improve healthcare services.'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleHome} activeOpacity={0.8}>
          <Text style={[styles.buttonText, { fontFamily: theme.fontFamily.bold }]}>
            {locale === 'kh' ? 'ត្រលប់ទៅផ្ទះ' : 'Return to Home'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 40 : 24,
    paddingVertical: isTablet ? 60 : 40,
  },
  iconContainer: {
    marginBottom: isTablet ? 32 : 24,
  },
  thankYouText: {
    fontSize: isTablet ? 32 : 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: isTablet ? 20 : 16,
    textAlign: 'center',
  },
  message: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: isTablet ? 28 : 24,
    paddingHorizontal: isTablet ? 40 : 20,
  },
  buttonContainer: {
    paddingHorizontal: isTablet ? 40 : 20,
    paddingBottom: isTablet ? 32 : 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: isTablet ? 18 : 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonText: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  confettiPiece: {
    position: 'absolute',
    top: 80,
  },
});
