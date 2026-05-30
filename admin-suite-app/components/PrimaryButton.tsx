import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { shadows, spacing, motion } from "@/constants/theme";

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
  const isSolid = !isOutline && !isGhost;

  const bg = isOutline || isGhost ? "transparent" : colors.primary;
  const fg = isOutline || isGhost ? colors.primary : colors.primaryForeground;
  const border = isOutline ? colors.border : "transparent";

  // Animated values for 3D press
  const pressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  // Shimmer sweep loop for solid buttons
  useEffect(() => {
    if (!isSolid || disabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(motion.shimmer.delay),
        Animated.timing(shimmerAnim, {
          toValue: 2,
          duration: motion.shimmer.duration,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isSolid, disabled, shimmerAnim]);

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

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  }, [onPress]);

  // Interpolated values
  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, motion.press.translateY],
  });
  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, motion.press.scale],
  });

  // Shimmer translate
  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-200, 400],
  });

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={{ alignSelf: fullWidth ? "stretch" : ("flex-start" as any) }}
    >
      <Animated.View
        style={[
          styles.btn,
          {
            backgroundColor: bg,
            borderColor: border,
            borderWidth: isOutline ? 1.5 : 0,
            borderRadius: colors.radius,
            opacity: disabled ? 0.5 : 1,
            paddingHorizontal: fullWidth ? spacing.lg : spacing.xl,
            transform: [{ translateY }, { scale }],
          },
          // Dynamic shadow: resting vs pressed
          isSolid && shadows.btnResting,
          isSolid && shadows.glow(colors.accent),
        ]}
      >
        {/* Shimmer sweep overlay */}
        {isSolid && !disabled && (
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                borderRadius: colors.radius,
                transform: [{ translateX: shimmerTranslateX }],
              },
            ]}
            pointerEvents="none"
          />
        )}

        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.label,
                { color: fg, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    overflow: "hidden",
  },
  label: {
    fontSize: 15,
    letterSpacing: 0.3,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: 120,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
});
