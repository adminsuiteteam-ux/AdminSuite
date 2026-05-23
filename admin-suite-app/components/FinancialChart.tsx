import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { chartRangeKeys, chartRanges } from "@/data/chartData";
import { useColors } from "@/hooks/useColors";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PADDING = { top: 16, right: 18, bottom: 28, left: 44 };

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(
      2,
    )} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

const SERIES_COLORS = {
  income: "#22c55e",
  expense: "#ef4444",
  profit: "#f97316",
};

export function FinancialChart({ formatValue }: { formatValue: (v: number) => string }) {
  const colors = useColors();
  const [range, setRange] = useState("7D");
  const [size, setSize] = useState({ w: 0, h: 240 });

  const data = useMemo(() => {
    const r = chartRanges[range as keyof typeof chartRanges];
    const profit = r.income.map((v: number, i: number) => v - r.expense[i]);
    return { ...r, profit };
  }, [range]);

  const allValues = useMemo(
    () => [...data.income, ...data.expense, ...data.profit],
    [data],
  );
  const yMin = Math.floor(Math.min(...allValues, 0) / 10) * 10;
  const yMax = Math.ceil(Math.max(...allValues) / 10) * 10;

  const innerW = Math.max(0, size.w - PADDING.left - PADDING.right);
  const innerH = Math.max(0, size.h - PADDING.top - PADDING.bottom);

  const xFor = (i: number) =>
    PADDING.left + (data.labels.length === 1 ? innerW / 2 : (innerW * i) / (data.labels.length - 1));
  const yFor = (v: number) =>
    PADDING.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const buildPoints = (arr: number[]) => arr.map((v, i) => ({ x: xFor(i), y: yFor(v) }));

  const incomePts = buildPoints(data.income);
  const expensePts = buildPoints(data.expense);
  const profitPts = buildPoints(data.profit);

  const incomePath = smoothPath(incomePts);
  const expensePath = smoothPath(expensePts);
  const profitPath = smoothPath(profitPts);

  const areaPath =
    incomePath +
    ` L ${incomePts[incomePts.length - 1].x.toFixed(2)} ${(PADDING.top + innerH).toFixed(2)} L ${incomePts[0].x.toFixed(2)} ${(PADDING.top + innerH).toFixed(2)} Z`;

  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 1300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [range, reveal, size.w]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: false,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [pulse]);

  const dashOffset = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [2400, 0],
  });

  const pulseR = pulse.interpolate({ inputRange: [0, 1], outputRange: [4, 14] });
  const pulseO = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const yTicks = [0, 0.33, 0.66, 1].map((t) => yMin + (yMax - yMin) * (1 - t));

  const totalIncome = data.income.reduce((s: number, v: number) => s + v, 0);
  const totalExpense = data.expense.reduce((s: number, v: number) => s + v, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["#000000", "#0a0a0a", "#000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow1} pointerEvents="none" />
      <View style={styles.glow2} pointerEvents="none" />
      <View style={styles.headerRow}>
        <View>
          <View style={styles.liveRow}>
            <View style={styles.liveDotWrap}>
              <Animated.View
                style={[
                  styles.liveDotPulse,
                  {
                    transform: [
                      {
                        scale: pulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.4],
                        }),
                      },
                    ],
                    opacity: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 0],
                    }),
                  },
                ]}
              />
              <View style={styles.liveDot} />
            </View>
            <Text style={[styles.liveLabel, { fontFamily: "Inter_600SemiBold" }]}>
              LIVE
            </Text>
          </View>
          <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
            Financial Pulse
          </Text>
        </View>

        <View style={styles.rangeRow}>
          {chartRangeKeys.map((k) => {
            const active = range === k;
            return (
              <Pressable
                key={k}
                onPress={() => setRange(k)}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: active
                      ? "rgba(255,255,255,0.18)"
                      : "transparent",
                    borderColor: active
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.12)",
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 11,
                    letterSpacing: 0.4,
                  }}
                >
                  {k}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SummaryPill
          color={SERIES_COLORS.profit}
          label="Net"
          value={formatValue(netProfit)}
          large
        />
        <SummaryPill
          color={SERIES_COLORS.income}
          label="In"
          value={formatValue(totalIncome)}
        />
        <SummaryPill
          color={SERIES_COLORS.expense}
          label="Out"
          value={formatValue(totalExpense)}
        />
      </View>

      <View
        style={[styles.chartArea, { height: size.h }]}
        onLayout={(e) =>
          setSize({ w: e.nativeEvent.layout.width, h: 240 })
        }
      >
        {size.w > 0 ? (
          <Svg width={size.w} height={size.h}>
            <Defs>
              <SvgLinearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={SERIES_COLORS.income} stopOpacity="0.35" />
                <Stop offset="1" stopColor={SERIES_COLORS.income} stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>

            {yTicks.map((tv, i) => {
              const y = yFor(tv);
              return (
                <React.Fragment key={i}>
                  <Line
                    x1={PADDING.left}
                    x2={size.w - PADDING.right}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={PADDING.left - 8}
                    y={y + 4}
                    fontSize="10"
                    fontFamily="Inter_500Medium"
                    fill="rgba(255,255,255,0.5)"
                    textAnchor="end"
                  >
                    {Math.round(tv)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            <Path d={areaPath} fill="url(#incomeFill)" opacity={0.9} />

            <AnimatedPath
              d={expensePath}
              stroke={SERIES_COLORS.expense}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2400"
              strokeDashoffset={dashOffset as any}
            />
            <AnimatedPath
              d={profitPath}
              stroke={SERIES_COLORS.profit}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2400"
              strokeDashoffset={dashOffset as any}
            />
            <AnimatedPath
              d={incomePath}
              stroke={SERIES_COLORS.income}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2400"
              strokeDashoffset={dashOffset as any}
            />

            {[
              { pts: incomePts, color: SERIES_COLORS.income },
              { pts: profitPts, color: SERIES_COLORS.profit },
              { pts: expensePts, color: SERIES_COLORS.expense },
            ].map((s, i) => {
              const last = s.pts[s.pts.length - 1];
              return (
                <React.Fragment key={i}>
                  <AnimatedCircle
                    cx={last.x}
                    cy={last.y}
                    r={pulseR as any}
                    fill={s.color}
                    opacity={pulseO as any}
                  />
                  <Circle cx={last.x} cy={last.y} r={4} fill={s.color} />
                  <Circle
                    cx={last.x}
                    cy={last.y}
                    r={2}
                    fill="#000000"
                  />
                </React.Fragment>
              );
            })}

            {data.labels.map((lab: string, i: number) => (
              <SvgText
                key={lab + i}
                x={xFor(i)}
                y={size.h - 8}
                fontSize="10"
                fontFamily="Inter_500Medium"
                fill="rgba(255,255,255,0.55)"
                textAnchor="middle"
              >
                {lab}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>

      <View style={styles.legendRow}>
        <Legend color={SERIES_COLORS.income} label="Income" />
        <Legend color={SERIES_COLORS.expense} label="Expense" />
        <Legend color={SERIES_COLORS.profit} label="Net profit" />
      </View>
    </View>
  );
}

function SummaryPill({ color, label, value, large }: { color: string; label: string; value: string; large?: boolean }) {
  return (
    <View style={styles.pillCol}>
      <View style={styles.pillLabelRow}>
        <View style={[styles.pillDot, { backgroundColor: color }]} />
        <Text
          style={[
            styles.pillLabel,
            { fontFamily: "Inter_500Medium" },
          ]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          large ? styles.pillValueLg : styles.pillValue,
          { fontFamily: "Inter_700Bold" },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 22,
    overflow: "hidden",
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 18,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  liveDotWrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  liveDotPulse: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  liveLabel: {
    color: "#22c55e",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  glow1: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(37,99,235,0.18)",
  },
  glow2: {
    position: "absolute",
    bottom: -80,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(249,115,22,0.12)",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    letterSpacing: -0.3,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 6,
  },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    marginTop: 14,
    gap: 14,
    alignItems: "flex-end",
  },
  pillCol: {
    minWidth: 0,
    flexShrink: 1,
  },
  pillLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pillLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  pillValue: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    letterSpacing: -0.2,
  },
  pillValueLg: {
    color: "#fff",
    fontSize: 22,
    letterSpacing: -0.6,
  },
  chartArea: {
    marginTop: 6,
    width: "100%",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginTop: 4,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
});
