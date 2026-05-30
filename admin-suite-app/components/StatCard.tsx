import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { shadows, typography, spacing, motion } from "@/constants/theme";

export function StatCard({
  label,
  value,
  icon,
  trend,
  accent,
  onPress,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  trend?: { dir: "up" | "down"; value: string };
  accent?: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  const accentColor = accent ?? colors.accent;

  // Animated values for tactile interaction
  const pressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: motion.springPress.friction,
      tension: motion.springPress.tension,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0,
      friction: motion.springSnappy.friction,
      tension: motion.springSnappy.tension,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  // Interpolated lift values
  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });
  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });
  const sheenOpacity = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const glowBorderOpacity = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.glass,
            borderRadius: colors.radius,
            borderColor: colors.glassBorder,
            transform: [{ translateY }, { scale }],
          },
          shadows.md,
        ]}
      >
        {/* Accent glow strip at top */}
        <View
          style={[
            styles.glowStrip,
            { backgroundColor: accentColor + "20" },
          ]}
        />

        {/* Glass sheen overlay (visible on press) */}
        <Animated.View
          style={[
            styles.glassSheen,
            {
              backgroundColor: colors.cardGlassSheen,
              borderRadius: colors.radius,
              opacity: sheenOpacity,
            },
          ]}
          pointerEvents="none"
        />

        {/* Glow border overlay (visible on press) */}
        <Animated.View
          style={[
            styles.glowBorder,
            {
              borderRadius: colors.radius,
              borderColor: accentColor,
              opacity: glowBorderOpacity,
            },
          ]}
          pointerEvents="none"
        />

        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: accentColor + "18",
              borderRadius: colors.radius - 6,
            },
          ]}
        >
          <Feather name={icon} size={18} color={accentColor} />
        </View>

        <Text
          style={[
            styles.value,
            {
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
              ...typography.stat,
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>

        <Text
          style={[
            styles.label,
            {
              color: colors.mutedForeground,
              fontFamily: "Inter_500Medium",
              ...typography.caption,
            },
          ]}
        >
          {label}
        </Text>

        {trend ? (
          <View style={styles.trendRow}>
            <View
              style={[
                styles.trendPill,
                {
                  backgroundColor:
                    (trend.dir === "up" ? colors.success : colors.danger) + "14",
                },
              ]}
            >
              <Feather
                name={trend.dir === "up" ? "trending-up" : "trending-down"}
                size={11}
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
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    minWidth: "45%",
  },
  card: {
    flex: 1,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    overflow: "hidden",
  },
  glowStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 24,
    letterSpacing: -0.6,
  },
  label: {
    fontSize: 12,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trend: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
