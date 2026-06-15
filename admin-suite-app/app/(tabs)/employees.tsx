import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState, useRef } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BlurView } from "expo-blur";

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

const ROLE_FILTERS = [
  { id: "all", label: "All Roles", icon: "users" as const, color: "#64748b" },
  { id: "BRANCH_ADMIN", label: "New Admin", icon: "award" as const, color: "#f59e0b" },
  { id: "HR", label: "Hr Manager", icon: "user-check" as const, color: "#6366f1" },
  { id: "SECRETARY", label: "Secretary", icon: "calendar" as const, color: "#0ea5e9" },
  { id: "FINANCE", label: "Finance Officer", icon: "trending-up" as const, color: "#10b981" },
  { id: "OPERATIONS", label: "Operations Manager", icon: "activity" as const, color: "#ef4444" },
  { id: "DEPT_MANAGER", label: "Department Manager", icon: "briefcase" as const, color: "#8b5cf6" },
];

const STATUS_DOT: Record<string, string> = {
  active: "#22c55e",
  on_leave: "#f97316",
  terminated: "#ef4444",
};

// Safe accessor: only returns a colour for known allowlisted status values.
const ALLOWED_EMPLOYEE_STATUSES = ["active", "on_leave", "terminated"] as const;
type EmployeeStatus = (typeof ALLOWED_EMPLOYEE_STATUSES)[number];
function getStatusDot(status: string): string {
  const key = ALLOWED_EMPLOYEE_STATUSES.includes(status as EmployeeStatus)
    ? (status as EmployeeStatus)
    : null;
  return key ? STATUS_DOT[key] : "#64748b";
}

export default function EmployeesScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { employees, refresh: refreshData } = useData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [refreshCount, setRefreshCount] = useState(0);

  // Role filter state and animations
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(350)).current;

  const toggleFilterMenu = () => {
    const toValue = filterMenuOpen ? 350 : 0;
    setFilterMenuOpen(!filterMenuOpen);
    Animated.spring(slideAnim, {
      toValue,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

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
      if (!(matchesQuery && matchesFilter)) return false;

      // Apply role filter
      if (selectedRoleFilter && selectedRoleFilter !== "all") {
        const roleUpper = e.role.toUpperCase();
        const matchesRole =
          roleUpper === selectedRoleFilter.toUpperCase() ||
          (selectedRoleFilter === "BRANCH_ADMIN" && roleUpper === "ADMIN") ||
          (selectedRoleFilter === "HR" && roleUpper === "HR MANAGER") ||
          (selectedRoleFilter === "FINANCE" && roleUpper === "FINANCE OFFICER") ||
          (selectedRoleFilter === "OPERATIONS" && roleUpper === "OPERATIONS MANAGER") ||
          (selectedRoleFilter === "DEPT_MANAGER" && roleUpper === "DEPARTMENT MANAGER");
        
        if (!matchesRole) return false;
      }

      return true;
    });
  }, [query, filter, selectedRoleFilter, refreshCount, employees]);

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;
  const bottomOffset = Math.max(insets.bottom, 14) + 62 + 16;
  const { width } = Dimensions.get("window");
  const popupWidth = width - 110;

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
                {t("employees.title")}
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
                            backgroundColor: getStatusDot(e.status),
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
                            <Text style={{ color: "#ef4444", fontSize: 9, fontFamily: "Inter_700Bold" }}>{t("employees.flagged")}</Text>
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

      {/* ── Floating RHS-to-LHS Role Filter Line ── */}
      <Animated.View
        style={[
          styles.filterPopupWrap,
          {
            bottom: bottomOffset,
            width: popupWidth,
            transform: [{ translateX: slideAnim }],
            opacity: slideAnim.interpolate({ inputRange: [0, 350], outputRange: [1, 0] }),
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <BlurView intensity={Platform.OS === "web" ? 30 : 60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.filterPopupInner}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 12, alignItems: "center" }}
          >
            {ROLE_FILTERS.map((opt) => {
              const active = selectedRoleFilter === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setSelectedRoleFilter(opt.id)}
                  style={({ pressed }) => [
                    styles.roleFilterChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : "transparent",
                      borderRadius: 14,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Feather
                    name={opt.icon}
                    size={12}
                    color={active ? colors.primaryForeground : opt.color}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      color: active ? colors.primaryForeground : colors.foreground,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                      fontSize: 11,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>

      {/* ── Floating Toggle Filter Button ── */}
      <View style={[styles.fabWrap, { bottom: bottomOffset }]}>
        <Pressable
          onPress={toggleFilterMenu}
          style={({ pressed }) => [
            styles.fabBtn,
            {
              backgroundColor: filterMenuOpen ? colors.accent : colors.primary,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <Feather
            name={filterMenuOpen ? "x" : "filter"}
            size={20}
            color={colors.primaryForeground}
          />
        </Pressable>
      </View>
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
  let s = map.active;
  if (status === "active") s = map.active;
  else if (status === "on_leave") s = map.on_leave;
  else if (status === "terminated") s = map.terminated;
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
  filterPopupWrap: {
    position: "absolute",
    right: 76,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 998,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  filterPopupInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  roleFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  fabWrap: {
    position: "absolute",
    right: 16,
    zIndex: 999,
  },
  fabBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
});
