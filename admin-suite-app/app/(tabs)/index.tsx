import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DashboardTour, TourLayout, TOUR_STEPS } from "@/components/DashboardTour";
import { FinancialChart } from "@/components/FinancialChart";
import { FloatInView } from "@/components/FloatInView";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

const { height: screenHeight } = Dimensions.get("window");

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { metrics: m, notifications, projects, transactions } = useData();
  const fmt = useCurrencyFmt();
  const recent = transactions.slice(0, 5);
  const activeProjects = projects.filter((p: any) => p.status === "active").slice(0, 3);
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = notifications.length;

  // ── Dashboard Tour State ──
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [layouts, setLayouts] = useState<Record<string, TourLayout>>({});
  const [scrollOffset, setScrollOffset] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const headerRef = useRef<View>(null);
  const profitRef = useRef<View>(null);
  const chartRef = useRef<View>(null);
  const statsRef = useRef<View>(null);
  const actionsRef = useRef<View>(null);

  const startTour = () => {
    setTourActive(true);
    setTourStep(0);
    setTimeout(() => {
      measureAndScrollStep(0);
    }, 150);
  };

  const finishTour = async () => {
    setTourActive(false);
    await AsyncStorage.setItem("admin-suite.dashboard-tour-complete", "true");
  };

  const TOTAL_TOUR_STEPS = TOUR_STEPS.length;

  const nextStep = () => {
    if (tourStep < TOTAL_TOUR_STEPS - 1) {
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

  // Steps 0-4 are scroll-content steps; steps 5-9 are nav-bar steps
  const SCROLL_KEYS = ["header", "profit", "chart", "stats", "actions"];

  const scrollToActiveStep = (stepIndex: number) => {
    if (stepIndex >= 5) {
      // For nav steps, scroll back to top so the full nav bar is visible
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
    if (stepIndex >= 5) {
      // Nav steps — scroll to top so nav bar is fully visible, no element measurement needed
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const refs = [headerRef, profitRef, chartRef, statsRef, actionsRef];
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

  // Check first-time tour triggers
  useEffect(() => {
    const checkTour = async () => {
      const tourComplete = await AsyncStorage.getItem("admin-suite.dashboard-tour-complete");
      if (!tourComplete) {
        setTimeout(() => {
          startTour();
        }, 1200);
      }
    };
    checkTour();
  }, []);

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;
  const isLargeScreen = width >= 768;
  const contentMaxWidth = 960;

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
        <View style={{ width: "100%", maxWidth: contentMaxWidth }}>
          <View style={styles.headerCard}>
            <LinearGradient
              colors={["#000000", "#0a0a0a", "#1e3a8a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              ref={headerRef}
              onLayout={(e) => {
                const { y, height, width, x } = e.nativeEvent.layout;
                setLayouts((prev) => ({
                  ...prev,
                  header: prev.header || { y: y + 34, height, width, x: x + 38 },
                }));
              }}
              style={styles.headerTop}
            >
              <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { fontFamily: "Inter_500Medium" }]}>
                {greeting()},
              </Text>
              <Text style={[styles.userName, { fontFamily: "Inter_700Bold" }]}>
                {user?.name ?? "Admin"}
              </Text>
              <View style={styles.roleChip}>
                <Feather name="shield" size={11} color="#fff" />
                <Text style={[styles.roleText, { fontFamily: "Inter_600SemiBold" }]}>
                  {(user?.role ?? "admin").toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => router.push("/settings" as any)}
                style={({ pressed }) => [
                  styles.bellBtn,
                  {
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
                hitSlop={8}
              >
                <Feather name="settings" size={19} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => setNotifOpen(true)}
                style={({ pressed }) => [
                  styles.bellBtn,
                  {
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
                hitSlop={8}
              >
                <Feather name="bell" size={20} color="#fff" />
                {unread > 0 ? (
                  <View style={styles.unreadDot}>
                    <Text style={[styles.unreadText, { fontFamily: "Inter_700Bold" }]}>
                      {unread}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>

          <View
            ref={profitRef}
            onLayout={(e) => {
              const { y, height, width, x } = e.nativeEvent.layout;
              setLayouts((prev) => ({
                ...prev,
                profit: prev.profit || { y: y + 130, height, width, x: x + 38 },
              }));
            }}
            style={styles.profitBox}
          >
            <Text style={[styles.profitLabel, { fontFamily: "Inter_500Medium" }]}>
              Net Profit · This Month
            </Text>
            <Text style={[styles.profitValue, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}>
              {fmt(m.netProfit)}
            </Text>
            <View style={styles.profitRow}>
              <View style={styles.miniStat}>
                <Feather name="arrow-down-left" size={12} color="#86efac" />
                <Text
                  style={[
                    styles.miniLabel,
                    { fontFamily: "Inter_500Medium", fontVariant: ["tabular-nums"] },
                  ]}
                >
                  Income {fmt(m.totalIncome)}
                </Text>
              </View>
              <View style={styles.miniStat}>
                <Feather name="arrow-up-right" size={12} color="#fca5a5" />
                <Text
                  style={[
                    styles.miniLabel,
                    { fontFamily: "Inter_500Medium", fontVariant: ["tabular-nums"] },
                  ]}
                >
                  Expense {fmt(m.totalExpense)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View
          ref={chartRef}
          onLayout={(e) => {
            const { y, height, width, x } = e.nativeEvent.layout;
            setLayouts((prev) => ({
              ...prev,
              chart: prev.chart || { y, height, width, x },
            }));
          }}
          style={{ width: "100%" }}
        >
          <FloatInView delay={100}>
            <FinancialChart formatValue={fmt} />
          </FloatInView>
        </View>

        <View
          ref={statsRef}
          onLayout={(e) => {
            const { y, height, width, x } = e.nativeEvent.layout;
            setLayouts((prev) => ({
              ...prev,
              stats: prev.stats || { y, height, width, x },
            }));
          }}
          style={{ width: "100%" }}
        >
          <FloatInView delay={160}>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard
                  label="Employees"
                  value={m.employees.toString()}
                  icon="users"
                  accent={colors.primary}
                  trend={{ dir: "up", value: "+2" }}
                />
                <StatCard
                  label="Active Projects"
                  value={m.activeProjects.toString()}
                  icon="layers"
                  accent={colors.accent}
                  trend={{ dir: "up", value: "+1" }}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  label="Clients"
                  value={m.clients.toString()}
                  icon="briefcase"
                  accent={colors.success}
                />
                <StatCard
                  label="Income"
                  value={fmt(m.totalIncome)}
                  icon="trending-up"
                  accent="#0ea5e9"
                  trend={{ dir: "up", value: "+12%" }}
                />
              </View>
            </View>
          </FloatInView>
        </View>

        <View
          ref={actionsRef}
          onLayout={(e) => {
            const { y, height, width, x } = e.nativeEvent.layout;
            setLayouts((prev) => ({
              ...prev,
              actions: prev.actions || { y, height, width, x },
            }));
          }}
          style={{ width: "100%" }}
        >
          <FloatInView delay={220}>
            <View style={styles.section}>
              <SectionHeader title="Quick actions" />
              <View style={styles.actionsRow}>
                <QuickAction
                  icon="user-plus"
                  label="Add employee"
                  color={colors.primary}
                  onPress={() => router.push("/employee/create" as any)}
                />
                <QuickAction
                  icon="dollar-sign"
                  label="Log income"
                  color={colors.success}
                  onPress={() => router.push("/(tabs)/finance")}
                />
                <QuickAction
                  icon="briefcase"
                  label="New client"
                  color={colors.accent}
                  onPress={() => router.push("/client/create" as any)}
                />
                <QuickAction
                  icon="file-text"
                  label="Export"
                  color="#0ea5e9"
                  onPress={() => {}}
                />
              </View>
            </View>
          </FloatInView>
        </View>

        <FloatInView delay={280}>
        <View style={styles.section}>
          <SectionHeader
            title="Active projects"
            action="See all"
            onPress={() => router.push("/(tabs)/projects")}
          />
          <View style={{ gap: 10 }}>
            {activeProjects.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push("/(tabs)/projects")}
                style={({ pressed }) => [
                  styles.projCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.projName,
                      { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={[
                      styles.projClient,
                      {
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {p.client_name}
                  </Text>
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
                          width: `${p.progress}%` as any,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text
                    style={[
                      styles.projValue,
                      { color: colors.foreground, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {fmt(p.value)}
                  </Text>
                  <Text
                    style={[
                      styles.progressLabel,
                      {
                        color: colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                        fontVariant: ["tabular-nums"],
                      },
                    ]}
                  >
                    {p.progress}%
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
        </FloatInView>

        <FloatInView delay={340}>
        <View style={styles.section}>
          <SectionHeader
            title="Recent transactions"
            action="See all"
            onPress={() => router.push("/(tabs)/finance")}
          />
          <View
            style={[
              styles.txList,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            {recent.map((t, i) => {
              const income = t.type === "income";
              return (
                <Pressable
                  key={t.id}
                  onPress={() => router.push("/(tabs)/finance")}
                  style={({ pressed }) => [
                    styles.txRow,
                    i < recent.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                    {
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor: income
                          ? colors.success + "1A"
                          : colors.danger + "1A",
                      },
                    ]}
                  >
                    <Feather
                      name={income ? "arrow-down-left" : "arrow-up-right"}
                      size={14}
                      color={income ? colors.success : colors.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.txDesc,
                        { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                      ]}
                      numberOfLines={1}
                    >
                      {t.description}
                    </Text>
                    <Text
                      style={[
                        styles.txMeta,
                        {
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                        },
                      ]}
                    >
                      {t.category} · {t.date}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      {
                        color: income ? colors.success : colors.danger,
                        fontFamily: "Inter_700Bold",
                        fontVariant: ["tabular-nums"],
                      },
                    ]}
                  >
                    {income ? "+" : ""}
                    {fmt(t.amount)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        </FloatInView>
        </View>
      </ScrollView>

      <NotificationsModal
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
      />

      <DashboardTour
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

interface QuickActionProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

function QuickAction({ icon, label, color, onPress }: QuickActionProps) {
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
      <View
        style={[
          styles.quickIcon,
          { backgroundColor: color + "1A" },
        ]}
      >
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text
        style={[
          styles.quickLabel,
          { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications } = useData();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={onClose}
      />
      <View
        style={[
          styles.modalSheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text
            style={[
              styles.sheetTitle,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Notifications
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 420 }}>
          {notifications.map((n) => (
            <View
              key={n.id}
              style={[
                styles.notifRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.notifIcon,
                  { backgroundColor: colors.primary + "1A" },
                ]}
              >
                <Feather name="bell" size={14} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  {n.title}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {n.body}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                }}
              >
                {n.time}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
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
  roleChip: {
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
  roleText: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#f59e0b",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "#fff",
    fontSize: 9,
  },
  profitBox: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  profitLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  profitValue: {
    color: "#fff",
    fontSize: 36,
    letterSpacing: -1,
    marginTop: 4,
  },
  profitRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  miniStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  statsGrid: {
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 22,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickAct: {
    flex: 1,
    minWidth: "45%",
    padding: 12,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 8,
    minHeight: 92,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  projCard: {
    flexDirection: "row",
    padding: 14,
    borderWidth: 1,
    gap: 12,
    alignItems: "center",
  },
  projName: { fontSize: 14 },
  projClient: { fontSize: 12, marginTop: 2 },
  progressBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },
  projValue: { fontSize: 14 },
  progressLabel: { fontSize: 11 },
  txList: {
    borderWidth: 1,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  txDesc: { fontSize: 14 },
  txMeta: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14 },

  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sheetTitle: { fontSize: 18, letterSpacing: -0.3 },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
