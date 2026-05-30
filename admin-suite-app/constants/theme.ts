/**
 * AdminSuite — 3D Glass Design System Theme Tokens
 * Volumetric shadows, glass effects, spacing rhythm, typography scale
 */
import { Platform, StyleSheet } from "react-native";

// ─── Elevation Shadows (4 levels, volumetric stacking) ─────────────────────
export const shadows = {
  /** Subtle lift — icons, chips */
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
  })!,
  /** Card default */
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
  })!,
  /** Floating card / modals */
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
  })!,
  /** Hero / header overlay */
  xl: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 16 },
    },
    android: { elevation: 14 },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 16 },
    },
  })!,
  /** Colored glow (for accent buttons) */
  glow: (color: string) =>
    Platform.select({
      ios: {
        shadowColor: color,
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
      default: {
        shadowColor: color,
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
    })!,

  // ─── 3D Button Depth States ─────────────────────────────────────────
  /** Resting state — button appears raised above surface */
  btnResting: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    android: { elevation: 6 },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
  })!,
  /** Pressed/depressed state — shadow collapses as button sinks */
  btnPressed: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    },
    android: { elevation: 1 },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    },
  })!,

  // ─── Card Hover/Lift States ─────────────────────────────────────────
  /** Card hover — lifts higher with deeper shadow */
  cardLifted: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 10 },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
  })!,
};

// ─── Glass Card Style (reusable) ──────────────────────────────────────────
export const glassCard = (
  glassBg: string,
  borderColor: string,
  radius: number = 20
) =>
  StyleSheet.create({
    container: {
      backgroundColor: glassBg,
      borderRadius: radius,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: borderColor,
      overflow: "hidden" as const,
      ...shadows.md,
    },
  }).container;

// ─── Spacing (8dp rhythm) ─────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

// ─── Typography Scale ─────────────────────────────────────────────────────
export const typography = {
  /** Hero / splash */
  display: {
    fontSize: 40,
    letterSpacing: -1.2,
    lineHeight: 46,
  },
  /** Page title */
  h1: {
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  /** Section title */
  h2: {
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  /** Card title */
  h3: {
    fontSize: 16,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  /** Body */
  body: {
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 22,
  },
  /** Small / caption */
  caption: {
    fontSize: 12,
    letterSpacing: 0.1,
    lineHeight: 16,
  },
  /** Overline / label */
  overline: {
    fontSize: 11,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: "uppercase" as const,
  },
  /** Stat number */
  stat: {
    fontSize: 24,
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  /** Large stat (hero) */
  heroStat: {
    fontSize: 38,
    letterSpacing: -1,
    lineHeight: 44,
  },
} as const;

// ─── Animation Config (spring physics) ───────────────────────────────────
export const motion = {
  /** Default entrance spring (cards, sections) */
  spring: {
    friction: 8,
    tension: 65,
  },
  /** Snappy interaction spring (buttons, tabs) */
  springSnappy: {
    friction: 6,
    tension: 120,
  },
  /** Extra-snappy press spring (3D button depress) */
  springPress: {
    friction: 5,
    tension: 180,
  },
  /** Gentle float entrance */
  floatIn: {
    duration: 580,
    easing: [0.16, 1, 0.3, 1] as [number, number, number, number],
  },
  /** Press feedback */
  press: {
    scale: 0.965,
    translateY: 3,
    duration: 120,
  },
  /** Shimmer sweep config */
  shimmer: {
    duration: 2400,
    delay: 600,
  },
} as const;
