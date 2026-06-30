// Single source of truth for all app colors (use theme.colors.app everywhere)
const APP_PALETTE = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  accent: '#22C55E',
  background: '#FFFFFF',
  secondaryBackground: '#F0FDF4',
  text: '#1A1A1A',
  textSecondary: '#4A5568',
  border: '#E5E7EB',
  cardBg: '#FFFFFF',
  selectedBg: '#D1FAE5',
  success: '#10B981',
  error: '#EF4444',
  errorAlt: '#FF3B30',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  neutralBg: '#F3F4F6',
  info: '#3B82F6',
  blue: '#3B82F6',
  green: '#10B981',
  red: '#FF3B30',
  infoLight: '#E3F2FD',
  white: '#FFFFFF',
  shadow: 'rgba(16, 185, 129, 0.15)',
  shadowBlack: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  muted: '#F5F5F5',
  searchBg: '#F1F5F9',
  errorBg: '#FFEBEE',
  errorText: '#C62828',
};

// Design system colors – all reference app palette for consistency
export const colors = {
  // App semantic palette (use this everywhere: colors.app.primary, etc.)
  app: APP_PALETTE,

  // Primary (aligned with app green)
  primary: {
    light: APP_PALETTE.primary,
    dark: APP_PALETTE.primaryLight,
    gradient: {
      light: [APP_PALETTE.primary, APP_PALETTE.primaryDark],
      dark: [APP_PALETTE.primaryLight, APP_PALETTE.primary],
    },
  },

  // Background
  background: {
    light: APP_PALETTE.background,
    dark: '#0f172a',
  },

  // Card
  card: {
    light: APP_PALETTE.cardBg,
    dark: '#1e293b',
  },

  // Text
  text: {
    primary: {
      light: APP_PALETTE.text,
      dark: '#f1f5f9',
    },
    secondary: {
      light: APP_PALETTE.textSecondary,
      dark: '#94a3b8',
    },
  },

  // Border
  border: {
    light: APP_PALETTE.border,
    dark: '#334155',
  },

  // Muted
  muted: {
    light: APP_PALETTE.muted,
    dark: '#1e293b',
  },

  // Accent
  accent: {
    light: APP_PALETTE.secondaryBackground,
    dark: '#1e293b',
  },

  // Status (same as app)
  success: APP_PALETTE.success,
  error: APP_PALETTE.error,
  warning: APP_PALETTE.warning,
  info: APP_PALETTE.info,
};
