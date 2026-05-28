import React, { useEffect, useRef } from "react";
import { Animated, Easing, ViewProps } from "react-native";

interface FloatInViewProps extends ViewProps {
  delay?: number;
  duration?: number;
  translate?: number;
  children: React.ReactNode;
}

export function FloatInView({
  delay = 0,
  duration = 520,
  translate = 18,
  style,
  children,
  ...rest
}: FloatInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(translate)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
    ]).start();
  }, [delay, duration, opacity, ty]);

  return (
    <Animated.View
      style={[{ opacity, transform: [{ translateY: ty }] }, style]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
