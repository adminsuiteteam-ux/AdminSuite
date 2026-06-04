import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatInView } from "@/components/FloatInView";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { getMediaUrl } from "@/services/api";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "on_leave", label: "On leave" },
  { id: "terminated", label: "Inactive" },
  { id: "flagged", label: "Flagged" },
  { id: "archived", label: "Archived" },
];

const STATUS_DOT: Record<string, string> = {
  active: "#22c55e",
  on_leave: "#f97316",
  terminated: "#ef4444",
};

export default function EmployeesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { employees, refresh: refreshData } = useData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [refreshCount, setRefreshCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refreshData();
      setRefreshCount((r) => r + 1);
    }, [])
  );

  const filtered = useMemo(() => {
    const trigger = refreshCount;
    return employees.filter((e: any) => {
      const matchesQuery =
        !query ||
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.role.toLowerCase().includes(query.toLowerCase());
      
      if (filter === "archived") {
        return matchesQuery && e.is_archived;
      }
      
      // By default, hide archived employees
      if (e.is_archived) {
        return false;
      }
      
      if (filter === "flagged") {
        return matchesQuery && e.is_flagged;
      }
      
      const matchesFilter = filter === "all" || e.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [query, filter, refreshCount, employees]);

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <FloatInView>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.title,
                  { color: colors.foreground, fontFamily: "Inter_700Bold" },
                ]}
              >
                Employees
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
                {filtered.length} of {employees.length} people
              </Text>
            </View>
             <Pressable
              onPress={() => router.push("/employee/create" as any)}
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

        <FloatInView delay={80}>
          <View
            style={[
              styles.searchWrap,
              {
                borderColor: colors.border,
                borderRadius: colors.radius,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or role"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.search,
                { color: colors.foreground, fontFamily: "Inter_500Medium" },
              ]}
            />
          </View>
        </FloatInView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
               <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.card,
                    borderRadius: 999,
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
                  {f.label}
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
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <EmptyState text="No people match your search" />
        ) : (
          filtered.map((e, i) => (
            <FloatInView key={e.id} delay={i * 50}>
              <Pressable onPress={() => router.push(`/employee/${e.id}` as any)}>
                {({ pressed }) => (
                   <View
                    style={[
                      styles.row,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: colors.radius,
                        opacity: pressed ? 0.9 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                  >
                    <View style={styles.avatarWrap}>
                      <Image
                        source={{ uri: getMediaUrl(e.avatar) }}
                        style={styles.avatar}
                      />
                      <View
                        style={[
                          styles.avatarStatus,
                          {
                            backgroundColor: STATUS_DOT[e.status] || "#64748b",
                            borderColor: colors.card,
                          },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text
                          style={[
                            styles.name,
                            {
                              color: colors.foreground,
                              fontFamily: "Inter_700Bold",
                              flexShrink: 1,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {e.name}
                        </Text>
                        {e.is_flagged && (
                          <View
                            style={{
                              backgroundColor: "#ef44441F",
                              borderRadius: 4,
                              paddingHorizontal: 5,
                              paddingVertical: 2,
                              marginLeft: 6,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Feather name="flag" size={10} color="#ef4444" />
                            <Text style={{ color: "#ef4444", fontSize: 9, fontFamily: "Inter_700Bold" }}>FLAGGED</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.role,
                          {
                            color: colors.mutedForeground,
                            fontFamily: "Inter_500Medium",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {e.role} · {e.department}
                      </Text>
                      <View style={styles.statRow}>
                        <StatusPill status={e.status} />
                        <Stars rating={e.performance} />
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                       <Text
                        style={[
                          styles.salary,
                          {
                            color: colors.foreground,
                            fontFamily: "Inter_700Bold",
                            fontVariant: ["tabular-nums"],
                          },
                        ]}
                      >
                        {fmt(e.salary)}
                      </Text>
                      <Text
                        style={[
                          styles.salaryLabel,
                          {
                            color: colors.mutedForeground,
                            fontFamily: "Inter_500Medium",
                          },
                        ]}
                      >
                        /month
                      </Text>
                      <Feather
                        name="chevron-right"
                        size={14}
                        color={colors.mutedForeground}
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </View>
                )}
              </Pressable>
            </FloatInView>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors = useColors();
  const map = {
    active: { bg: "#22c55e1A", color: "#16a34a", label: "Active" },
    on_leave: { bg: "#f973161A", color: "#ea580c", label: "On leave" },
    terminated: { bg: "#ef44441A", color: "#dc2626", label: "Inactive" },
  };
  const s = (map as Record<string, any>)[status] ?? map.active;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text
        style={{
          color: s.color,
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          letterSpacing: 0.4,
        }}
      >
        {s.label.toUpperCase()}
      </Text>
    </View>
  );
}

function Stars({ rating }: { rating: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={11}
          color={i <= rating ? "#f59e0b" : colors.border}
        />
      ))}
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
        <Feather name="inbox" size={28} color={colors.mutedForeground} />
      </View>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_500Medium",
          fontSize: 14,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 4 },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    marginTop: 14,
  },
  search: { flex: 1, fontSize: 14 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarStatus: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  name: { fontSize: 15 },
  role: { fontSize: 12, marginTop: 2 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  salary: { fontSize: 14 },
  salaryLabel: { fontSize: 10, marginTop: 2 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
