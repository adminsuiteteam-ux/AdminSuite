import { Feather } from "@expo/vector-icons";
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

  const tabBarPad = (Platform.OS === "web" ? 84 : 80) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
              {filtered.length} project{filtered.length === 1 ? "" : "s"}
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
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
                    backgroundColor: active ? colors.primary : colors.background,
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
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: tabBarPad,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <EmptyState text="No projects in this status" />
        ) : (
          filtered.map((p) => (
            <Pressable
              key={p.id}
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
          ))
        )}
      </ScrollView>
    </View>
  );
}

function statusColor(status: string, colors: any) {
  switch (status) {
    case "active":
      return colors.primary;
    case "completed":
      return colors.success;
    case "on_hold":
      return colors.warning;
    case "planned":
      return "#0ea5e9";
    default:
      return colors.mutedForeground;
  }
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
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
});
