import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { FloatInView } from "@/components/FloatInView";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";
import { apiService } from "@/services/api";

type Task = {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  due_date: string;
  status: "assigned" | "in_progress" | "completed";
  created_at: string;
};

type TabKey = "all" | "pending" | "completed";

const TABS: { key: TabKey; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "all", label: "All", icon: "list" },
  { key: "pending", label: "Active", icon: "clock" },
  { key: "completed", label: "Done", icon: "check-circle" },
];

export default function EmployeeTasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiService.getEmployeeDashboard();
      setTasks(res.data.tasks || []);
    } catch (err: any) {
      if (!silent) {
        showToast({ title: "Error", message: "Could not load tasks.", type: "error" });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks(true);
  };

  const handleUpdateStatus = async (status: "assigned" | "in_progress" | "completed") => {
    if (!selectedTask) return;
    setUpdating(true);
    try {
      const res = await apiService.updateEmployeeTask(selectedTask.id, {
        status,
        description: reportNote.trim() || undefined,
      });
      const updated = res.data.task;
      setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updated : t)));
      setSelectedTask(null);
      setReportNote("");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      showToast({
        title: "Task Updated",
        message: `Task marked as ${status.replace("_", " ")}.`,
        type: "success",
      });
    } catch (err: any) {
      showToast({ title: "Failed", message: "Could not update task.", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityColor = (p: string) => {
    if (p === "high") return colors.danger;
    if (p === "medium") return colors.warning ?? "#f59e0b";
    return colors.success;
  };

  const getStatusLabel = (s: string) => {
    if (s === "completed") return "Completed";
    if (s === "in_progress") return "In Progress";
    return "Assigned";
  };

  const getStatusIcon = (s: string): keyof typeof Feather.glyphMap => {
    if (s === "completed") return "check-circle";
    if (s === "in_progress") return "activity";
    return "clipboard";
  };

  const getStatusColor = (s: string) => {
    if (s === "completed") return colors.success;
    if (s === "in_progress") return colors.accent;
    return colors.primary;
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return t.status !== "completed";
    return t.status === "completed";
  });

  const totalCount = tasks.length;
  const activeCount = tasks.filter((t) => t.status !== "completed").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;

  const isDark = colors.isDark;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          My Tasks
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Manage, track, and report your assigned work
        </Text>

        {/* ── Stats strip ── */}
        {!loading && (
          <View style={styles.statsRow}>
            <StatPill label="Total" value={totalCount} color={colors.primary} />
            <StatPill label="Active" value={activeCount} color={colors.accent} />
            <StatPill label="Done" value={completedCount} color={colors.success} />
            <View style={[styles.ratePill, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.rateNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {completionRate}%
              </Text>
              <Text style={[styles.rateLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                done
              </Text>
            </View>
          </View>
        )}

        {/* ── Tabs ── */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const count = tab.key === "all" ? totalCount : tab.key === "pending" ? activeCount : completedCount;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabBtn,
                  active && { backgroundColor: colors.primary },
                ]}
              >
                <Feather
                  name={tab.icon}
                  size={13}
                  color={active ? colors.primaryForeground : colors.foreground}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: active ? colors.primaryForeground : colors.foreground,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                <View style={[styles.tabBadge, { backgroundColor: active ? (colors.isDark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.25)") : colors.background }]}>
                  <Text style={[styles.tabBadgeTxt, { color: active ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Task List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarPad, paddingHorizontal: 16, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={{ gap: 12 }}>
            {filteredTasks.map((t, idx) => (
              <FloatInView key={t.id} delay={idx * 40}>
                <Pressable
                  onPress={() => {
                    setSelectedTask(t);
                    setReportNote("");
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: t.status === "completed" ? colors.success + "40" : colors.border,
                      borderRadius: colors.radius,
                      opacity: pressed ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    },
                  ]}
                >
                  {/* Left accent bar */}
                  <View style={[styles.cardAccent, { backgroundColor: getPriorityColor(t.priority) }]} />

                  <View style={styles.cardBody}>
                    {/* Row 1: priority + due */}
                    <View style={styles.cardTopRow}>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(t.priority) + "18" }]}>
                        <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(t.priority) }]} />
                        <Text style={[styles.priorityTxt, { color: getPriorityColor(t.priority), fontFamily: "Inter_600SemiBold" }]}>
                          {t.priority.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.dueRow}>
                        <Feather name="calendar" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.dueTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                          {t.due_date}
                        </Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {t.title}
                    </Text>

                    {/* Description preview */}
                    <Text style={[styles.cardDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                      {t.description}
                    </Text>

                    {/* Status footer */}
                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                      <Feather name={getStatusIcon(t.status)} size={13} color={getStatusColor(t.status)} />
                      <Text style={[styles.statusTxt, { color: getStatusColor(t.status), fontFamily: "Inter_500Medium" }]}>
                        {getStatusLabel(t.status)}
                      </Text>
                      {t.status !== "completed" && (
                        <View style={styles.tapHint}>
                          <Text style={[styles.tapHintTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                            Tap to update
                          </Text>
                          <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              </FloatInView>
            ))}

            {filteredTasks.length === 0 && (
              <View style={styles.emptyState}>
                <Feather
                  name={activeTab === "completed" ? "award" : "inbox"}
                  size={44}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {activeTab === "completed" ? "Nothing completed yet" : "No tasks here"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {activeTab === "completed"
                    ? "Complete your active tasks to see them here."
                    : "You're all caught up! Pull to refresh."}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Task Detail Bottom Sheet ── */}
      {selectedTask && (
        <Modal
          visible={!!selectedTask}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedTask(null)}
        >
          <Pressable style={styles.backdrop} onPress={() => setSelectedTask(null)} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? "#09090b" : "#fff",
                paddingBottom: insets.bottom + 24,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedTask.priority) + "18" }]}>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(selectedTask.priority) }]} />
                <Text style={[styles.priorityTxt, { color: getPriorityColor(selectedTask.priority), fontFamily: "Inter_600SemiBold" }]}>
                  {selectedTask.priority.toUpperCase()}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedTask(null)} hitSlop={12}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {selectedTask.title}
              </Text>
              <View style={styles.sheetMeta}>
                <Feather name="calendar" size={13} color={colors.mutedForeground} />
                <Text style={[styles.sheetMetaTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Due: {selectedTask.due_date}
                </Text>
                <View style={[styles.statusChip, { backgroundColor: getStatusColor(selectedTask.status) + "20" }]}>
                  <Text style={[styles.statusChipTxt, { color: getStatusColor(selectedTask.status), fontFamily: "Inter_600SemiBold" }]}>
                    {getStatusLabel(selectedTask.status)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.sheetDesc, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                {selectedTask.description}
              </Text>

              {selectedTask.status !== "completed" && (
                <View style={[styles.reportBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.reportLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                    Progress Notes (Optional)
                  </Text>
                  <TextInput
                    value={reportNote}
                    onChangeText={setReportNote}
                    placeholder="Describe what you've done..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    style={[
                      styles.reportInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: isDark ? "#18181b" : "#f4f4f5",
                        fontFamily: "Inter_400Regular",
                      },
                    ]}
                  />
                </View>
              )}
            </ScrollView>

            {/* Action buttons */}
            {selectedTask.status !== "completed" ? (
              <View style={styles.actionRow}>
                {selectedTask.status === "assigned" && (
                  <Pressable
                    onPress={() => handleUpdateStatus("in_progress")}
                    disabled={updating}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Feather name="play" size={15} color="#fff" />
                    <Text style={[styles.actionBtnTxt, { fontFamily: "Inter_600SemiBold" }]}>
                      {updating ? "Updating..." : "Start Working"}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => handleUpdateStatus("completed")}
                  disabled={updating}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.success, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="check" size={15} color="#fff" />
                  <Text style={[styles.actionBtnTxt, { fontFamily: "Inter_600SemiBold" }]}>
                    {updating ? "Submitting..." : "Mark Complete"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.completedBanner, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
                <Feather name="check-circle" size={16} color={colors.success} />
                <Text style={[styles.completedBannerTxt, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>
                  This task is complete
                </Text>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statPill, { backgroundColor: color + "12", borderColor: color + "30" }]}>
      <Text style={[styles.statNum, { color, fontFamily: "Inter_700Bold" }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    alignItems: "center",
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statNum: { fontSize: 20 },
  statLabel: { fontSize: 11, marginTop: 1 },
  ratePill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rateNum: { fontSize: 20 },
  rateLabel: { fontSize: 11, marginTop: 1 },
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginTop: 14,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabLabel: { fontSize: 12 },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeTxt: { fontSize: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityTxt: { fontSize: 10, letterSpacing: 0.3 },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dueTxt: { fontSize: 12 },
  cardTitle: { fontSize: 15, letterSpacing: -0.2 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusTxt: { fontSize: 12 },
  tapHint: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 2 },
  tapHintTxt: { fontSize: 11 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 72,
    gap: 12,
  },
  emptyTitle: { fontSize: 17 },
  emptySubtitle: { fontSize: 13, textAlign: "center", maxWidth: 260 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 20, letterSpacing: -0.4, marginBottom: 8 },
  sheetMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sheetMetaTxt: { fontSize: 13 },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  statusChipTxt: { fontSize: 11 },
  sheetDesc: { fontSize: 14, lineHeight: 22 },
  reportBox: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  reportLabel: { fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  reportInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 80,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionBtnTxt: { color: "#fff", fontSize: 15 },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  completedBannerTxt: { fontSize: 15 },
});
