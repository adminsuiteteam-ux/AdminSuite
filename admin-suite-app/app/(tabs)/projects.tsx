import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/app/(tabs)/employees";
import { FloatInView } from "@/components/FloatInView";
import { RingChart } from "@/components/RingChart";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

const STATUSES = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "planned", label: "Planned" },
  { id: "on_hold", label: "On hold" },
  { id: "completed", label: "Completed" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "#2563eb",
  planned: "#0ea5e9",
  on_hold: "#f59e0b",
  completed: "#22c55e",
};

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { projects } = useData();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(
    () =>
      projects.filter((p: any) => filter === "all" || p.status === filter),
    [filter, projects],
  );

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p: any) => p.status === "active").length;
    const planned = projects.filter((p: any) => p.status === "planned").length;
    const onHold = projects.filter((p: any) => p.status === "on_hold").length;
    const completed = projects.filter((p: any) => p.status === "completed").length;
    return { total, active, planned, onHold, completed };
  }, [projects]);

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;

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
          {/* Header Row */}
          <FloatInView>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.title,
                    { color: colors.foreground, fontFamily: "Inter_700Bold" },
                  ]}
                >
                  Projects
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  Manage active contracts, milestones & progress
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/project/create" as any)}
                style={({ pressed }) => [
                  styles.addBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="plus" size={18} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </FloatInView>

          {/* Stats Hero Card */}
          <FloatInView delay={120}>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["#000000", "#0a0a0a", "#0f172a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroGlowB} />
              <View style={styles.heroGlowA} />

              <View style={styles.heroLeft}>
                <Text style={[styles.heroLabel, { fontFamily: "Inter_600SemiBold" }]}>
                  TOTAL PROJECTS
                </Text>
                <Text style={[styles.heroNum, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}>
                  {stats.total}
                </Text>
                <View style={{ gap: 6, marginTop: 10 }}>
                  <Bullet
                    color={STATUS_COLORS.active}
                    label="Active"
                    value={`${stats.active}`}
                  />
                  <Bullet
                    color={STATUS_COLORS.planned}
                    label="Planned"
                    value={`${stats.planned}`}
                  />
                  <Bullet
                    color={STATUS_COLORS.on_hold}
                    label="On Hold"
                    value={`${stats.onHold}`}
                  />
                  <Bullet
                    color={STATUS_COLORS.completed}
                    label="Completed"
                    value={`${stats.completed}`}
                  />
                </View>
              </View>
              <View style={styles.heroRight}>
                <RingChart
                  size={160}
                  stroke={10}
                  centerLabel={`${stats.active}`}
                  centerSub="ACTIVE"
                  data={[
                    { value: stats.active, color: STATUS_COLORS.active },
                    { value: stats.planned, color: STATUS_COLORS.planned },
                    { value: stats.onHold, color: STATUS_COLORS.on_hold },
                    { value: stats.completed, color: STATUS_COLORS.completed },
                  ]}
                />
              </View>
            </View>
          </FloatInView>

          {/* Status Tab Filters */}
          <FloatInView delay={200}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
            >
              {STATUSES.map((s) => {
                const active = filter === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setFilter(s.id)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : colors.card,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.primaryForeground : colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 12,
                      }}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </FloatInView>

          {/* Projects List */}
          <View style={{ gap: 12 }}>
            {filtered.length === 0 ? (
              <EmptyState text="No projects in this status" />
            ) : (
              filtered.map((p, i) => (
                <FloatInView key={p.id} delay={250 + i * 50}>
                  <Pressable
                    onPress={() => router.push(`/project/${p.id}` as any)}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.card,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            borderRadius: colors.radius,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        <View style={styles.cardHead}>
                          <View
                            style={[
                              styles.iconBox,
                              {
                                backgroundColor: statusColor(p.status, colors) + "1A",
                              },
                            ]}
                          >
                            <Feather
                              name="layers"
                              size={18}
                              color={statusColor(p.status, colors)}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.name,
                                {
                                  color: colors.foreground,
                                  fontFamily: "Inter_700Bold",
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {p.name}
                            </Text>
                            <Text
                              style={[
                                styles.client,
                                {
                                  color: colors.mutedForeground,
                                  fontFamily: "Inter_500Medium",
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {p.client_name}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusPill,
                              { backgroundColor: statusColor(p.status, colors) + "1A" },
                            ]}
                          >
                            <Text
                              style={{
                                color: statusColor(p.status, colors),
                                fontFamily: "Inter_600SemiBold",
                                fontSize: 10,
                                letterSpacing: 0.4,
                              }}
                            >
                              {p.status.replace("_", " ").toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.metaRow}>
                          <View>
                            <Text
                              style={[
                                styles.metaLabel,
                                {
                                  color: colors.mutedForeground,
                                  fontFamily: "Inter_500Medium",
                                },
                              ]}
                            >
                              Value
                            </Text>
                            <Text
                              style={[
                                styles.metaValue,
                                { color: colors.foreground, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
                              ]}
                            >
                              {fmt(p.value)}
                            </Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 24 }}>
                            <View style={styles.progressHeader}>
                              <Text
                                style={[
                                  styles.metaLabel,
                                  {
                                    color: colors.mutedForeground,
                                    fontFamily: "Inter_500Medium",
                                  },
                                ]}
                              >
                                Progress
                              </Text>
                              <Text
                                style={[
                                  styles.progressNum,
                                  {
                                    color: colors.foreground,
                                    fontFamily: "Inter_600SemiBold",
                                    fontVariant: ["tabular-nums"],
                                  },
                                ]}
                              >
                                {p.progress}%
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.progressBg,
                                { backgroundColor: colors.border },
                              ]}
                            >
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${p.progress}%` as import("react-native").DimensionValue,
                                    backgroundColor: statusColor(p.status, colors),
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      </View>
                    )}
                  </Pressable>
                </FloatInView>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Bullet({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.bullet}>
      <View style={[styles.bulletDot, { backgroundColor: color }]} />
      <Text style={[styles.bulletLabel, { fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <Text style={[styles.bulletValue, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}>
        {value}
      </Text>
    </View>
  );
}

function statusColor(status: string, colors: any) {
  switch (status) {
    case "active":
      return STATUS_COLORS.active;
    case "completed":
      return STATUS_COLORS.completed;
    case "on_hold":
      return STATUS_COLORS.on_hold;
    case "planned":
      return STATUS_COLORS.planned;
    default:
      return colors.mutedForeground;
  }
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  title: { fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 4 },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
  card: { padding: 16, borderWidth: 1, gap: 16 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 15, letterSpacing: -0.2 },
  client: { fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaRow: { flexDirection: "row", alignItems: "flex-end" },
  metaLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 18, marginTop: 2, letterSpacing: -0.3 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressNum: { fontSize: 12 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  
  /* Stats Card styling */
  heroCard: {
    borderRadius: 26,
    overflow: "hidden",
    flexDirection: "row",
    padding: 20,
    minHeight: 210,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroGlowA: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(37,99,235,0.18)",
  },
  heroGlowB: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  heroLeft: { flex: 1, justifyContent: "center", paddingRight: 8 },
  heroRight: { alignItems: "flex-end", justifyContent: "center" },
  heroLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    letterSpacing: 1,
  },
  heroNum: { color: "#fff", fontSize: 50, letterSpacing: -2, marginTop: 4 },
  bullet: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletDot: { width: 8, height: 8, borderRadius: 4 },
  bulletLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, flex: 1 },
  bulletValue: { color: "#fff", fontSize: 14 },
});
