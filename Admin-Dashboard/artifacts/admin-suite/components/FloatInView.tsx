import React, { useEffect, useRef } from "react";
import { Animated, Easing, ViewProps } from "react-native";

export function FloatInView({
  delay = 0,
  duration = 520,
  translate = 18,
  style,
  children,
  ...rest
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(translate)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
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
