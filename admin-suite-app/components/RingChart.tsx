import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function RingChart({
  size = 220,
  stroke = 14,
  data,
  centerLabel,
  centerSub,
}: { size?: number; stroke?: number; data: { value: number; color: string }[]; centerLabel: string; centerSub?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;

  const rings = data.map((d, i) => {
    const r = size / 2 - stroke / 2 - i * (stroke + 6);
    const c = 2 * Math.PI * r;
    const fraction = d.value / total;
    return { ...d, r, c, fraction };
  });

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1500,
      delay: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        {rings.map((r, i) => (
          <Circle
            key={"bg" + i}
            cx={cx}
            cy={cy}
            r={r.r}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
            fill="none"
          />
        ))}
        {rings.map((r, i) => {
          const offset = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [r.c, r.c - r.c * r.fraction],
          });
          return (
            <AnimatedCircle
              key={"fg" + i}
              cx={cx}
              cy={cy}
              r={r.r}
              stroke={r.color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${r.c} ${r.c}`}
              strokeDashoffset={offset as any}
            />
          );
        })}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { fontFamily: "Inter_700Bold" }]}>
          {centerLabel}
        </Text>
        {centerSub ? (
          <Text style={[styles.sub, { fontFamily: "Inter_500Medium" }]}>
            {centerSub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  value: { color: "#fff", fontSize: 30, letterSpacing: -0.6 },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2, letterSpacing: 0.6 },
});
