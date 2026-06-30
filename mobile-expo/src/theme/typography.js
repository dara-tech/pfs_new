import { Platform } from 'react-native';

// All typography uses Kantumruy Pro
const KANTUMRUY = {
  regular: 'KantumruyPro_400Regular',
  medium: 'KantumruyPro_500Medium',
  semiBold: 'KantumruyPro_600SemiBold',
  bold: 'KantumruyPro_700Bold',
};

// Typography system optimized for tablets - all Kantumruy
export const typography = {
  // Headings
  h1: {
    fontFamily: KANTUMRUY.bold,
    fontSize: Platform.OS === 'ios' ? 32 : 30,
    fontWeight: '700',
    lineHeight: Platform.OS === 'ios' ? 40 : 38,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: KANTUMRUY.bold,
    fontSize: Platform.OS === 'ios' ? 28 : 26,
    fontWeight: '700',
    lineHeight: Platform.OS === 'ios' ? 36 : 34,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: KANTUMRUY.semiBold,
    fontSize: Platform.OS === 'ios' ? 24 : 22,
    fontWeight: '600',
    lineHeight: Platform.OS === 'ios' ? 32 : 30,
  },
  h4: {
    fontFamily: KANTUMRUY.semiBold,
    fontSize: Platform.OS === 'ios' ? 20 : 18,
    fontWeight: '600',
    lineHeight: Platform.OS === 'ios' ? 28 : 26,
  },
  // Body text
  body: {
    large: {
      fontFamily: KANTUMRUY.regular,
      fontSize: Platform.OS === 'ios' ? 18 : 16,
      lineHeight: Platform.OS === 'ios' ? 28 : 26,
    },
    medium: {
      fontFamily: KANTUMRUY.regular,
      fontSize: Platform.OS === 'ios' ? 16 : 15,
      lineHeight: Platform.OS === 'ios' ? 24 : 22,
    },
    small: {
      fontFamily: KANTUMRUY.regular,
      fontSize: Platform.OS === 'ios' ? 14 : 13,
      lineHeight: Platform.OS === 'ios' ? 20 : 18,
    },
  },
  // Labels
  label: {
    fontFamily: KANTUMRUY.semiBold,
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    fontWeight: '600',
    lineHeight: Platform.OS === 'ios' ? 20 : 18,
  },
  // Button text
  button: {
    fontFamily: KANTUMRUY.semiBold,
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
};

// Font family - all Kantumruy Pro
export const fontFamily = {
  default: KANTUMRUY.regular,
  regular: KANTUMRUY.regular,
  medium: KANTUMRUY.medium,
  semiBold: KANTUMRUY.semiBold,
  bold: KANTUMRUY.bold,
  khmer: KANTUMRUY.regular,
  fallback: Platform.select({
    ios: ['System', 'San Francisco'],
    android: ['Roboto', 'sans-serif'],
  }),
};
