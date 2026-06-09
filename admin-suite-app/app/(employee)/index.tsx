import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatInView } from "@/components/FloatInView";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";
import { EmployeeDashboardTour, TourLayout, EMPLOYEE_TOUR_STEPS } from "@/components/EmployeeDashboardTour";

const { height: screenHeight } = Dimensions.get("window");

export default function EmployeeDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  // ── Employee Dashboard Tour State ──
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [layouts, setLayouts] = useState<Record<string, TourLayout>>({});
  const [scrollOffset, setScrollOffset] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const headerRef = useRef<View>(null);
  const statsRef = useRef<View>(null);
  const actionsRef = useRef<View>(null);
  const activeTasksRef = useRef<View>(null);

  const startTour = () => {
    setTourActive(true);
    setTourStep(0);
    setTimeout(() => {
      measureAndScrollStep(0);
    }, 150);
  };

  const finishTour = async () => {
    setTourActive(false);
    await AsyncStorage.setItem("admin-suite.employee-dashboard-tour-complete", "true");
  };

  const nextStep = () => {
    if (tourStep < EMPLOYEE_TOUR_STEPS.length - 1) {
      const nextS = tourStep + 1;
      setTourStep(nextS);
      setTimeout(() => {
        measureAndScrollStep(nextS);
      }, 50);
    } else {
      finishTour();
    }
  };

  const prevStep = () => {
    if (tourStep > 0) {
      const prevS = tourStep - 1;
      setTourStep(prevS);
      setTimeout(() => {
        measureAndScrollStep(prevS);
      }, 50);
    }
  };

  const SCROLL_KEYS = ["header", "stats", "actions", "active_tasks"];

  const scrollToActiveStep = (stepIndex: number) => {
    if (stepIndex >= SCROLL_KEYS.length) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const currentKey = SCROLL_KEYS[stepIndex];
    const layout = layouts[currentKey];
    if (layout) {
      const screenHeightOffset = (screenHeight - layout.height) / 2;
      const scrollToY = Math.max(0, layout.y - screenHeightOffset);
      scrollViewRef.current?.scrollTo({ y: scrollToY, animated: true });
    }
  };

  const measureAndScrollStep = (stepIndex: number) => {
    if (stepIndex >= SCROLL_KEYS.length) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const refs = [headerRef, statsRef, actionsRef, activeTasksRef];
    const currentRef = refs[stepIndex];
    const currentKey = SCROLL_KEYS[stepIndex];

    if (currentRef?.current && scrollViewRef.current) {
      currentRef.current.measureLayout(
        scrollViewRef.current as any,
        (x, y, width, height) => {
          const measured = { x, y, width, height };
          setLayouts((prev) => ({
            ...prev,
            [currentKey]: measured,
          }));
          const screenHeightOffset = (screenHeight - height) / 2;
          const scrollToY = Math.max(0, y - screenHeightOffset);
          scrollViewRef.current?.scrollTo({ y: scrollToY, animated: true });
        },
        () => {
          scrollToActiveStep(stepIndex);
        }
      );
    } else {
      scrollToActiveStep(stepIndex);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError("");
      const res = await apiService.getEmployeeDashboard();
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load employee dashboard:", err);
      setError("Failed to load dashboard. Pull down to retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Check first-time tour triggers
  useEffect(() => {
    const checkTour = async () => {
      const tourComplete = await AsyncStorage.getItem("admin-suite.employee-dashboard-tour-complete");
      if (!tourComplete) {
        setTimeout(() => {
          startTour();
        }, 1200);
      }
    };
    if (data) {
      checkTour();
    }
  }, [data]);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return colors.danger;
      case "medium": return colors.accent;
      default: return colors.success;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return "check-circle";
      case "in_progress": return "activity";
      default: return "clipboard";
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const tasks = data?.tasks || [];
  const activities = data?.activities || [];
  const pendingTasks = tasks.filter((t: any) => t.status !== "completed");

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollViewRef}
        scrollEnabled={!tourActive}
        onScroll={(e) => {
          setScrollOffset(e.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: tabBarPad,
          paddingTop: insets.top,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 960 }}>
          {/* Header Card */}
          <View
            ref={headerRef}
            onLayout={(e) => {
              const { y, height, width, x } = e.nativeEvent.layout;
              setLayouts((prev) => ({
                ...prev,
                header: prev.header || { y, height, width, x },
              }));
            }}
            style={styles.headerCard}
          >
            <LinearGradient
              colors={["#000000", "#0a0a0a", "#1e3a8a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.greeting, { fontFamily: "Inter_500Medium" }]}>
                  {greeting()},
                </Text>
                <Text style={[styles.userName, { fontFamily: "Inter_700Bold" }]}>
                  {user?.name ?? "Employee"}
                </Text>
                {user?.business_name ? (
                  <View style={styles.companyChip}>
                    <Feather name="briefcase" size={11} color="#fff" />
                    <Text style={[styles.companyText, { fontFamily: "Inter_600SemiBold" }]}>
                      {user.business_name}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  {
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
                hitSlop={8}
              >
                <Feather name="log-out" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Stats Grid */}
          <FloatInView delay={100}>
            <View
              ref={statsRef}
              onLayout={(e) => {
                const { y, height, width, x } = e.nativeEvent.layout;
                setLayouts((prev) => ({
                  ...prev,
                  stats: prev.stats || { y, height, width, x },
                }));
              }}
              style={styles.statsGrid}
            >
              <View style={styles.statsRow}>
                <StatCard
                  label="Pending Tasks"
                  value={pendingTasks.length.toString()}
                  icon="check-square"
                  accent={colors.primary}
                />
                <StatCard
                  label="Completed"
                  value={(tasks.length - pendingTasks.length).toString()}
                  icon="award"
                  accent={colors.success}
                />
              </View>
            </View>
          </FloatInView>

          {/* Quick Actions */}
          <FloatInView delay={160}>
            <View
              ref={actionsRef}
              onLayout={(e) => {
                const { y, height, width, x } = e.nativeEvent.layout;
                setLayouts((prev) => ({
                  ...prev,
                  actions: prev.actions || { y, height, width, x },
                }));
              }}
              style={styles.section}
            >
              <SectionHeader title="Quick Actions" />
              <View style={styles.actionsRow}>
                <QuickAction
                  icon="check-square"
                  label="My Tasks"
                  color={colors.primary}
                  onPress={() => router.push("/(employee)/tasks")}
                />
                <QuickAction
                  icon="message-square"
                  label="Team Chat"
                  color={colors.accent}
                  onPress={() => router.push("/(employee)/chat")}
                />
                <QuickAction
                  icon="credit-card"
                  label="Finance"
                  color={colors.success}
                  onPress={() => router.push("/(employee)/finance")}
                />
                <QuickAction
                  icon="user"
                  label="Profile"
                  color="#0ea5e9"
                  onPress={() => router.push("/(employee)/profile")}
                />
              </View>
            </View>
          </FloatInView>

          {/* Tasks Summary */}
          <FloatInView delay={220}>
            <View
              ref={activeTasksRef}
              onLayout={(e) => {
                const { y, height, width, x } = e.nativeEvent.layout;
                setLayouts((prev) => ({
                  ...prev,
                  active_tasks: prev.active_tasks || { y, height, width, x },
                }));
              }}
              style={styles.section}
            >
              <SectionHeader
                title="Active Tasks"
                action="See all"
                onPress={() => router.push("/(employee)/tasks")}
              />
              <View style={{ gap: 10 }}>
                {pendingTasks.slice(0, 3).map((t: any) => (
                  <Pressable
                    key={t.id}
                    onPress={() => router.push("/(employee)/tasks")}
                    style={({ pressed }) => [
                      styles.taskCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: colors.radius,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={styles.taskCardInner}>
                      <View style={[styles.taskIconCircle, { backgroundColor: getPriorityColor(t.priority) + "1A" }]}>
                        <Feather name={getStatusIcon(t.status) as any} size={16} color={getPriorityColor(t.priority)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.taskTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                          {t.title}
                        </Text>
                        <Text style={[styles.taskDue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                          Due: {t.due_date}
                        </Text>
                      </View>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(t.priority) + "15" }]}>
                        <Text style={[styles.priorityText, { color: getPriorityColor(t.priority), fontFamily: "Inter_600SemiBold" }]}>
                          {t.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
                {pendingTasks.length === 0 && (
                  <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                    <Feather name="check" size={24} color={colors.success} />
                    <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                      All tasks completed! Enjoy your day.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </FloatInView>

          {/* Activity Feeds */}
          <FloatInView delay={280}>
            <View style={styles.section}>
              <SectionHeader title="Recent Activity" />
              <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                {activities.map((a: any, i: number) => (
                  <View
                    key={a.id}
                    style={[
                      styles.activityRow,
                      i < activities.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                    ]}
                  >
                    <View style={[styles.activityIcon, { backgroundColor: colors.primary + "1A" }]}>
                      <Feather name="activity" size={13} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activityAction, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                        {a.action}
                      </Text>
                      <Text style={[styles.activityDetails, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {a.details}
                      </Text>
                    </View>
                  </View>
                ))}
                {activities.length === 0 && (
                  <Text style={[styles.emptyLogsText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    No recent activity logs.
                  </Text>
                )}
              </View>
            </View>
          </FloatInView>
        </View>
      </ScrollView>

      <EmployeeDashboardTour
        active={tourActive}
        step={tourStep}
        layouts={layouts}
        scrollOffset={scrollOffset}
        onNext={nextStep}
        onBack={prevStep}
        onSkip={finishTour}
      />
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAct,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: color + "1A" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 22,
    borderRadius: 24,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  greeting: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },
  userName: {
    color: "#fff",
    fontSize: 24,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  companyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  companyText: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    paddingHorizontal: 16,
    marginTop: 16,
    width: "100%",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
    width: "100%",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  quickAct: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 11,
  },
  taskCard: {
    borderWidth: 1,
    padding: 14,
  },
  taskCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTitle: {
    fontSize: 14,
  },
  taskDue: {
    fontSize: 12,
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 9,
    letterSpacing: 0.2,
  },
  emptyState: {
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
  },
  listCard: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  activityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activityAction: {
    fontSize: 13,
  },
  activityDetails: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyLogsText: {
    textAlign: "center",
    paddingVertical: 16,
    fontSize: 13,
  },
});
