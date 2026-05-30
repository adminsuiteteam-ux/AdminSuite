/**
 * AdminSuite — Cinema Dark Glass Design System
 * Premium 3D glassmorphic color tokens
 *
 * Light: Frosted glass on cool gray canvas
 * Dark:  Deep cinematic OLED with indigo glow
 */

const colors = {
  light: {
    text: "#0c0c0e",
    tint: "#0c0c0e",

    background: "#f4f5f7",
    foreground: "#0c0c0e",

    card: "rgba(255, 255, 255, 0.72)",
    cardForeground: "#0c0c0e",

    primary: "#0c0c0e",
    primaryForeground: "#ffffff",

    secondary: "#dbeafe",
    secondaryForeground: "#1e3a8a",

    muted: "#eef1f5",
    mutedForeground: "#6b7280",

    accent: "#5E6AD2",
    accentForeground: "#ffffff",

    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "rgba(0, 0, 0, 0.06)",
    input: "#e5e7eb",

    // Glass tokens
    glass: "rgba(255, 255, 255, 0.55)",
    glassBorder: "rgba(255, 255, 255, 0.85)",
    glassOverlay: "rgba(255, 255, 255, 0.08)",
    accentGlow: "rgba(94, 106, 210, 0.18)",
    surfaceElevated: "rgba(255, 255, 255, 0.88)",

    // 3D interaction tokens
    shimmerBase: "rgba(255, 255, 255, 0)",
    shimmerPeak: "rgba(255, 255, 255, 0.35)",
    pressHighlight: "rgba(255, 255, 255, 0.12)",
    focusGlow: "rgba(94, 106, 210, 0.25)",
    cardGlassSheen: "rgba(255, 255, 255, 0.18)",
    inputGlass: "rgba(255, 255, 255, 0.65)",
    inputGlassBorder: "rgba(0, 0, 0, 0.08)",
    inputFocusGlow: "rgba(94, 106, 210, 0.12)",
  },
  dark: {
    text: "#EDEDEF",
    tint: "#EDEDEF",

    background: "#050506",
    foreground: "#EDEDEF",

    card: "rgba(255, 255, 255, 0.05)",
    cardForeground: "#EDEDEF",

    primary: "#EDEDEF",
    primaryForeground: "#050506",

    secondary: "#1e293b",
    secondaryForeground: "#93c5fd",

    muted: "#1a1a1f",
    mutedForeground: "#8A8F98",

    accent: "#5E6AD2",
    accentForeground: "#ffffff",

    success: "#34d399",
    warning: "#fbbf24",
    danger: "#f87171",

    destructive: "#f87171",
    destructiveForeground: "#ffffff",

    border: "rgba(255, 255, 255, 0.08)",
    input: "#27272a",

    // Glass tokens
    glass: "rgba(255, 255, 255, 0.04)",
    glassBorder: "rgba(255, 255, 255, 0.08)",
    glassOverlay: "rgba(255, 255, 255, 0.03)",
    accentGlow: "rgba(94, 106, 210, 0.20)",
    surfaceElevated: "rgba(255, 255, 255, 0.07)",

    // 3D interaction tokens
    shimmerBase: "rgba(255, 255, 255, 0)",
    shimmerPeak: "rgba(255, 255, 255, 0.08)",
    pressHighlight: "rgba(255, 255, 255, 0.06)",
    focusGlow: "rgba(94, 106, 210, 0.35)",
    cardGlassSheen: "rgba(255, 255, 255, 0.06)",
    inputGlass: "rgba(255, 255, 255, 0.06)",
    inputGlassBorder: "rgba(255, 255, 255, 0.10)",
    inputFocusGlow: "rgba(94, 106, 210, 0.20)",
  },
  radius: 20,
};

export default colors;
