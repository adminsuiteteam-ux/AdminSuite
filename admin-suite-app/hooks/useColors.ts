import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useSettings } from "@/context/SettingsContext";

export function useColors() {
  const scheme = useColorScheme();
  let themeMode = "system";
  try {
    // We use try-catch because useColors might be called outside SettingsProvider (e.g. error boundary)
    const settings = useSettings();
    themeMode = settings.theme;
  } catch (e) {}

  const isDark =
    themeMode === "dark" || (themeMode === "system" && scheme === "dark");

  const palette = isDark && "dark" in colors ? (colors as any).dark : colors.light;
  return {
    ...palette,
    textMuted: palette.mutedForeground || (isDark ? "#8A8F98" : "#6b7280"),
    cardSelected: isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(0, 0, 0, 0.05)",
    radius: colors.radius,
    isDark,
  };
}

