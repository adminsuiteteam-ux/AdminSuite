import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatInView } from "@/components/FloatInView";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

export default function SavingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { savings } = useData();

  const totalSaved = savings.reduce((s, a) => s + Number(a.saved), 0);
  const totalTarget = savings.reduce((s, a) => s + Number(a.target), 0);

  const tabBarPad = (Platform.OS === "web" ? 84 : 80) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: tabBarPad,
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
              Savings
            </Text>
            <Pressable
              onPress={() => router.push("/savings/create" as any)}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              hitSlop={10}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>

          <FloatInView delay={100}>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["#000000", "#172554", "#1e3a8a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.glowA} />
              
              <Text style={[styles.heroLabel, { fontFamily: "Inter_600SemiBold" }]}>
                TOTAL SAVED
              </Text>
              <Text style={[styles.heroValue, { fontFamily: "Inter_700Bold" }]}>
                {fmt(totalSaved)}
              </Text>
              <Text style={[styles.heroTarget, { fontFamily: "Inter_500Medium" }]}>
                Target: {fmt(totalTarget)}
              </Text>
            </View>
          </FloatInView>

          <FloatInView delay={200}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              YOUR SAVINGS GOALS
            </Text>
          </FloatInView>

          <View style={{ gap: 12 }}>
            {savings.map((s, i) => {
              const target = Number(s.target);
              const saved = Number(s.saved);
              const savPct = target > 0 ? Math.round((saved / target) * 100) : 0;
              return (
                <FloatInView key={s.id} delay={260 + i * 60}>
                  <View style={[styles.savingsCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                    <View style={styles.savingsTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>{s.name}</Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 }}>{s.purpose}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>{fmt(saved)}</Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 }}>/ {fmt(target)}</Text>
                      </View>
                    </View>
                    <View style={[styles.savingsBarBg, { backgroundColor: colors.muted }]}>
                      <View style={[styles.savingsBarFill, { width: `${Math.min(savPct, 100)}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                        Goal target
                      </Text>
                      <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                        {savPct}%
                      </Text>
                    </View>
                  </View>
                </FloatInView>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  topTitle: { fontSize: 20, letterSpacing: -0.4 },
  heroCard: { borderRadius: 24, padding: 24, overflow: "hidden", marginBottom: 24 },
  glowA: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(250,204,21,0.15)" },
  heroLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: 1 },
  heroValue: { color: "#fff", fontSize: 40, letterSpacing: -1.5, marginTop: 4 },
  heroTarget: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 8 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.8, paddingHorizontal: 4, marginBottom: 16 },
  savingsCard: { padding: 18, borderWidth: 1 },
  savingsTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  savingsBarBg: { height: 8, borderRadius: 999, overflow: "hidden" },
  savingsBarFill: { height: "100%", borderRadius: 999 },
});
