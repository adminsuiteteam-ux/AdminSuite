import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatInView } from "@/components/FloatInView";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { budgetCategories } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";

export default function BudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();

  const totalAlloc = budgetCategories.reduce((s, c) => s + c.allocated, 0);
  const totalSpent = budgetCategories.reduce((s, c) => s + c.spent, 0);
  const pct = Math.round((totalSpent / totalAlloc) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 140,
          paddingTop: insets.top + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              hitSlop={10}
            >
              <Feather name="chevron-left" size={22} color={colors.foreground} />
            </Pressable>
            <Text
              style={[
                styles.topTitle,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              Budget
            </Text>
            <View style={{ width: 38 }} />
          </View>

          <FloatInView>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["#000000", "#0a0a0a", "#0f172a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.glowA} />
              <View style={styles.glowB} />

              <Text style={[styles.heroLabel, { fontFamily: "Inter_600SemiBold" }]}>
                MONTHLY BUDGET
              </Text>
              <Text style={[styles.heroValue, { fontFamily: "Inter_700Bold" }]}>
                {fmt(totalSpent)}{" "}
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 18,
                    fontFamily: "Inter_500Medium",
                  }}
                >
                  / {fmt(totalAlloc)}
                </Text>
              </Text>
              <View style={styles.heroBarBg}>
                <View
                  style={[
                    styles.heroBarFill,
                    {
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: pct > 90 ? "#ef4444" : "#22c55e",
                    },
                  ]}
                />
              </View>
              <View style={styles.heroFootRow}>
                <Text style={[styles.heroFoot, { fontFamily: "Inter_500Medium" }]}>
                  {pct}% used this month
                </Text>
                <Text style={[styles.heroFoot, { fontFamily: "Inter_500Medium" }]}>
                  {fmt(totalAlloc - totalSpent)} left
                </Text>
              </View>
            </View>
          </FloatInView>

          <FloatInView delay={150}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              CATEGORIES
            </Text>
          </FloatInView>

          <View style={{ gap: 12 }}>
            {budgetCategories.map((c, i) => (
              <FloatInView key={c.id} delay={200 + i * 60}>
                <BudgetRow item={c} fmt={fmt} />
              </FloatInView>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function BudgetRow({ item, fmt }) {
  const colors = useColors();
  const pct = Math.min(100, Math.round((item.spent / item.allocated) * 100));
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 1100,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, widthAnim]);

  const widthInter = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowLeft}>
          <View style={[styles.rowDot, { backgroundColor: item.color }]} />
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 14,
            }}
          >
            {item.name}
          </Text>
        </View>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            fontSize: 14,
          }}
        >
          {fmt(item.spent)}
        </Text>
      </View>
      <View style={[styles.rowBarBg, { backgroundColor: colors.muted }]}>
        <Animated.View
          style={{
            width: widthInter,
            height: "100%",
            borderRadius: 999,
            backgroundColor: item.color,
          }}
        />
      </View>
      <View style={styles.rowFoot}>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_500Medium",
            fontSize: 11,
          }}
        >
          Allocated {fmt(item.allocated)}
        </Text>
        <Text
          style={{
            color: pct > 90 ? "#ef4444" : colors.mutedForeground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 11,
          }}
        >
          {pct}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  topTitle: { fontSize: 20, letterSpacing: -0.4 },

  heroCard: {
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    marginBottom: 22,
  },
  glowA: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(37,99,235,0.25)",
  },
  glowB: {
    position: "absolute",
    bottom: -60,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    letterSpacing: 1,
  },
  heroValue: {
    color: "#fff",
    fontSize: 32,
    letterSpacing: -1,
    marginTop: 4,
  },
  heroBarBg: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 16,
  },
  heroBarFill: { height: "100%", borderRadius: 999 },
  heroFootRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  heroFoot: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  row: { padding: 16, borderWidth: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowBarBg: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  rowFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
