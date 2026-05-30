import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, ViewProps } from "react-native";
import { motion } from "@/constants/theme";

interface FloatInViewProps extends ViewProps {
  delay?: number;
  duration?: number;
  translate?: number;
  scale?: boolean;
  children: React.ReactNode;
}

/**
 * Premium float-in entrance animation with spring-based easing.
 * Slides up from below with simultaneous fade + optional subtle scale.
 * Respects AccessibilityInfo.isReduceMotionEnabled — falls back to
 * a simple opacity fade without translational layout jumps.
 */
export function FloatInView({
  delay = 0,
  duration = motion.floatIn.duration,
  translate = 24,
  scale = true,
  style,
  children,
  ...rest
}: FloatInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(translate)).current;
  const sc = useRef(new Animated.Value(scale ? 0.97 : 1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  // Check a11y preference
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        if (mounted) setReduceMotion(enabled);
      }
    );

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      // Simple fade only — no translations or scale
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        delay,
        useNativeDriver: true,
      }).start();
      ty.setValue(0);
      sc.setValue(1);
      return;
    }

    const [x1, y1, x2, y2] = motion.floatIn.easing;
    const bezier = Easing.bezier(x1, y1, x2, y2);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
        easing: bezier,
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: bezier,
      }),
      ...(scale
        ? [
            Animated.timing(sc, {
              toValue: 1,
              duration: duration + 80,
              delay,
              useNativeDriver: true,
              easing: bezier,
            }),
          ]
        : []),
    ]).start();
  }, [delay, duration, opacity, ty, sc, scale, reduceMotion]);

  return (
    <Animated.View
      style={[
        {
          opacity,
          transform: [
            { translateY: ty },
            { scale: sc },
          ],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
