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
  return { ...palette, radius: colors.radius };
}

