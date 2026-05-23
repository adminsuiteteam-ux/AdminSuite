import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function StatCard({ label, value, icon, trend, accent }: { label: string; value: string; icon: keyof typeof Feather.glyphMap; trend?: { dir: 'up' | 'down'; value: string }; accent?: string }) {
  const colors = useColors();
  const accentColor = accent ?? colors.primary;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: accentColor + "1A",
            borderRadius: colors.radius - 4,
          },
        ]}
      >
        <Feather name={icon} size={18} color={accentColor} />
      </View>
      <Text
        style={[
          styles.value,
          { color: colors.foreground, fontFamily: "Inter_700Bold" },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.label,
          { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
        ]}
      >
        {label}
      </Text>
      {trend ? (
        <View style={styles.trendRow}>
          <Feather
            name={trend.dir === "up" ? "trending-up" : "trending-down"}
            size={12}
            color={trend.dir === "up" ? colors.success : colors.danger}
          />
          <Text
            style={[
              styles.trend,
              {
                color: trend.dir === "up" ? colors.success : colors.danger,
                fontFamily: "Inter_600SemiBold",
              },
            ]}
          >
            {trend.value}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  value: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  trend: {
    fontSize: 12,
  },
});
