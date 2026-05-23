import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop, Text as SvgText } from "react-native-svg";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const PADDING = { top: 14, right: 14, bottom: 26, left: 32 };

export function IncomeExpenseChart({ data, formatValue, height = 200 }) {
  const [w, setW] = React.useState(0);
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [reveal, w]);

  const innerW = Math.max(0, w - PADDING.left - PADDING.right);
  const innerH = height - PADDING.top - PADDING.bottom;

  const allValues = data.flatMap((d) => [d.income, d.expense]);
  const yMax = Math.ceil(Math.max(...allValues, 1) / 10) * 10;

  const groupW = data.length ? innerW / data.length : 0;
  const barW = Math.min(14, groupW * 0.32);
  const gap = 4;

  return (
    <View
      style={[styles.wrap, { height }]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Defs>
            <SvgLinearGradient id="incomeBar" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#22c55e" stopOpacity="1" />
              <Stop offset="1" stopColor="#22c55e" stopOpacity="0.4" />
            </SvgLinearGradient>
            <SvgLinearGradient id="expenseBar" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ef4444" stopOpacity="1" />
              <Stop offset="1" stopColor="#ef4444" stopOpacity="0.4" />
            </SvgLinearGradient>
          </Defs>

          {[0, 0.5, 1].map((t, i) => {
            const v = yMax * (1 - t);
            const y = PADDING.top + innerH * t;
            return (
              <SvgText
                key={i}
                x={PADDING.left - 6}
                y={y + 3}
                fontSize="9"
                fontFamily="Inter_500Medium"
                fill="rgba(255,255,255,0.5)"
                textAnchor="end"
              >
                {Math.round(v)}
              </SvgText>
            );
          })}

          {data.map((d, i) => {
            const cx = PADDING.left + groupW * i + groupW / 2;
            const incH = (d.income / yMax) * innerH;
            const expH = (d.expense / yMax) * innerH;
            const incHA = reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [0, incH],
            });
            const expHA = reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [0, expH],
            });
            const incY = reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [PADDING.top + innerH, PADDING.top + innerH - incH],
            });
            const expY = reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [PADDING.top + innerH, PADDING.top + innerH - expH],
            });
            return (
              <React.Fragment key={d.label}>
                <AnimatedRect
                  x={cx - barW - gap / 2}
                  y={incY as any}
                  width={barW}
                  height={incHA as any}
                  rx={4}
                  fill="url(#incomeBar)"
                />
                <AnimatedRect
                  x={cx + gap / 2}
                  y={expY as any}
                  width={barW}
                  height={expHA as any}
                  rx={4}
                  fill="url(#expenseBar)"
                />
                <SvgText
                  x={cx}
                  y={height - 8}
                  fontSize="10"
                  fontFamily="Inter_500Medium"
                  fill="rgba(255,255,255,0.6)"
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      ) : null}
      <View style={styles.legend}>
        <Legend color="#22c55e" label="Income" />
        <Legend color="#ef4444" label="Expense" />
      </View>
    </View>
  );
}

function Legend({ color, label }) {
  return (
    <View style={styles.legChip}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legText, { fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  legend: {
    position: "absolute",
    top: 8,
    right: 12,
    flexDirection: "row",
    gap: 10,
  },
  legChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legText: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
});
