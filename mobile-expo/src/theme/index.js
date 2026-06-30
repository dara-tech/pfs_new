import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { fontFamily } from './typography';

export const theme = {
  colors,
  typography,
  spacing,
  fontFamily,
  
  // Professional shadows (consistent with app colors)
  shadows: {
    sm: {
      shadowColor: colors.app?.shadowBlack || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: colors.app?.shadowBlack || '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: colors.app?.shadowBlack || '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 6,
    },
  },
  
  // Border radius (matching web: 0.5rem = 8px)
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
};

export { colors, typography, spacing, fontFamily };
export const appColors = colors.app;
