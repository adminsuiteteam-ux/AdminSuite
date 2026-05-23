import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "solid" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export function PrimaryButton({
  label,
  onPress,
  variant = "solid",
  loading = false,
  disabled = false,
  fullWidth = true,
  icon = null,
}: PrimaryButtonProps) {
  const colors = useColors();
  const isOutline = variant === "outline";
  const isGhost = variant === "ghost";

  const bg = isOutline || isGhost ? "transparent" : colors.primary;
  const fg = isOutline || isGhost ? colors.primary : colors.primaryForeground;
  const border = isOutline ? colors.primary : "transparent";

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {},
          );
        }
        onPress?.();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: isOutline ? 1.5 : 0,
          borderRadius: colors.radius,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          paddingHorizontal: fullWidth ? 16 : 22,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: fg, fontFamily: "Inter_600SemiBold" }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
