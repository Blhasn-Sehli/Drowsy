/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/**
 * Unified warm color palette for the app.
 * Primary: warm orange, accent colors for alerts.
 */
const primaryColor = '#FF6B35';
const accentAmber = '#FFAA00';

export const AppColors = {
  primary: '#FF6B35',
  primaryLight: '#FFF3E0',
  primaryDark: '#E55A25',

  danger: '#FF4444',
  dangerLight: '#FFEBEE',

  warning: '#FFAA00',
  warningLight: '#FFF8E1',

  success: '#44AA44',
  successLight: '#E8F5E9',

  emotion: '#8B5CF6',
  emotionLight: '#F3E8FF',

  textPrimary: '#1A1A2E',
  textSecondary: '#666',
  textMuted: '#999',

  cardBg: '#FAFAFA',
  border: '#F0F0F0',
};

export const Colors = {
  light: {
    text: '#1A1A2E',
    background: '#FFFFFF',
    tint: primaryColor,
    icon: '#888',
    tabIconDefault: '#BBBBBB',
    tabIconSelected: primaryColor,
    primary: primaryColor,
    surface: '#FAFAFA',
    accentAmber: accentAmber,
  },
  dark: {
    text: '#ffffff',
    background: '#131415',
    tint: primaryColor,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: primaryColor,
    primary: primaryColor,
    surface: '#1c1e20',
    accentAmber: accentAmber,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'Space Grotesk',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'Space Grotesk',
    mono: 'monospace',
  },
  web: {
    sans: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'Space Grotesk', 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Theme configuration with spacing and border radius from the design
 */
export const ThemeConfig = {
  colors: {
    primary: primaryColor,
    accentAmber: accentAmber,
    backgroundLight: '#FFFFFF',
    backgroundDark: '#131415',
    surface: '#1c1e20',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    none: 0,
    sm: 2,
    default: 4,
    lg: 8,
    xl: 12,
    full: 9999,
  },
  shadows: {
    hudRing: {
      primary: primaryColor,
      blur: 15,
      spread: 0.3,
    },
    glowGreen: {
      color: primaryColor,
      blur: 20,
      opacity: 0.4,
    },
    glowAmber: {
      color: accentAmber,
      blur: 20,
      opacity: 0.3,
    },
  },
};
