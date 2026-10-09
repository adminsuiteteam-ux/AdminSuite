import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { apiService } from "@/services/api";

type Priority = "low" | "medium" | "high" | "urgent";

const PRIORITY_OPTIONS: { id: Priority; label: string; color: string; bg: string }[] = [
  { id: "low", label: "Low", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  { id: "medium", label: "Medium", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
  { id: "high", label: "High", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  { id: "urgent", label: "Urgent", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
];

const QUICK_TITLE_SUGGESTIONS = [
  "Client Follow-up",
  "Prepare Report",
  "Site Inspection",
  "Document Review",
  "Update Inventory",
  "System Audit",
];

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRelativeDateLabel(targetDate: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Due Today";
  if (diffDays === 1) return "Due Tomorrow";
  if (diffDays > 1) return `Due in ${diffDays} days`;
  if (diffDays === -1) return "Overdue (Yesterday)";
  return `Overdue by ${Math.abs(diffDays)} days`;
}

export default function AssignTaskScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { employees, refresh } = useData();
  const params = useLocalSearchParams<{
    employeeId?: string;
    employeeName?: string;
    employeeRole?: string;
    employeeAvatar?: string;
  }>();

  // Find employee data
  const employee = useMemo(() => {
    if (!params.employeeId) return null;
    return employees.find((e: any) => String(e.id) === String(params.employeeId)) || null;
  }, [params.employeeId, employees]);

  const empName = employee?.name || params.employeeName || "Employee";
  const empRole = employee?.role || params.employeeRole || "Team Member";
  const empDepartment = employee?.department || "";
  const empAvatar = employee?.avatar || params.employeeAvatar;
  const empInitials = employee?.initials || empName.slice(0, 2).toUpperCase();

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  
  // Automated Date Logic (Defaults to Today, zero manual typing needed)
  const [dueDate, setDueDate] = useState<Date>(() => new Date());
  const [timePreset, setTimePreset] = useState("5:00 PM (EOD)");
  const [submitting, setSubmitting] = useState(false);

  // Date Preset Handlers
  const handleSetPreset = (daysOffset: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + daysOffset);
    setDueDate(newDate);
  };

  const handleSetEndOfMonth = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDueDate(lastDay);
  };

  const handleAdjustDays = (delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setDueDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      return Alert.alert("Validation Error", "Please provide a task title.");
    }
    if (!description.trim()) {
      return Alert.alert("Validation Error", "Please provide task instructions or description.");
    }

    const employeeId = params.employeeId || employee?.id;
    if (!employeeId) {
      return Alert.alert("Error", "Employee could not be identified.");
    }

    try {
      setSubmitting(true);
      const isoDate = formatDateISO(dueDate);

      const payload = {
        employee: Number(employeeId),
        title: title.trim(),
        description: description.trim(),
        priority,
        due_date: isoDate,
        status: "assigned",
      };

      await apiService.createTask(payload);
      await refresh();

      Alert.alert(
        "Task Assigned",
        `Task "${title.trim()}" has been assigned to ${empName} successfully.`,
        [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error("Assign task failed:", err);
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to assign task.";
      Alert.alert("Assignment Error", typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const isToday = formatDateISO(dueDate) === formatDateISO(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = formatDateISO(dueDate) === formatDateISO(tomorrow);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
    >
      {/* ── Top Header ────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Assign Task</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            Direct assignment to team member
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* ── Assignee Card ─────────────────────────────────── */}
        <View style={[styles.assigneeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarWrap}>
            {empAvatar ? (
              <Image source={{ uri: empAvatar }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.accent }]}>
                <Text style={styles.avatarText}>{empInitials}</Text>
              </View>
            )}
            <View style={styles.activeDot} />
          </View>

          <View style={styles.assigneeInfo}>
            <Text style={[styles.assigneeName, { color: colors.foreground }]} numberOfLines={1}>
              {empName}
            </Text>
            <Text style={[styles.assigneeRole, { color: colors.mutedForeground }]} numberOfLines={1}>
              {empRole} {empDepartment ? `· ${empDepartment}` : ""}
            </Text>
          </View>

          <View style={[styles.badgePill, { backgroundColor: "rgba(99, 102, 241, 0.12)", borderColor: "rgba(99, 102, 241, 0.3)" }]}>
            <Feather name="user-check" size={12} color="#6366f1" />
            <Text style={styles.badgeText}>Assignee</Text>
          </View>
        </View>

        {/* ── Task Title ────────────────────────────────────── */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Task Title</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="e.g. Conduct monthly server maintenance"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
          />

          {/* Quick Suggestion Chips */}
          <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Quick suggestions:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {QUICK_TITLE_SUGGESTIONS.map((sug, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  } catch {}
                  setTitle(sug);
                }}
                style={({ pressed }) => [
                  styles.sugChip,
                  {
                    backgroundColor: title === sug ? colors.accent : colors.card,
                    borderColor: title === sug ? colors.accent : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sugChipText,
                    { color: title === sug ? "#ffffff" : colors.mutedForeground },
                  ]}
                >
                  {sug}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Priority Selector ─────────────────────────────── */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Priority Level</Text>
          <View style={styles.priorityGrid}>
            {PRIORITY_OPTIONS.map((item) => {
              const isSelected = priority === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    } catch {}
                    setPriority(item.id);
                  }}
                  style={({ pressed }) => [
                    styles.priorityBtn,
                    {
                      backgroundColor: isSelected ? item.bg : colors.card,
                      borderColor: isSelected ? item.color : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={[styles.priorityDot, { backgroundColor: item.color }]} />
                  <Text
                    style={[
                      styles.priorityText,
                      {
                        color: isSelected ? item.color : colors.mutedForeground,
                        fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_500Medium",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Automated Date & Time (No Manual Typing) ────────── */}
        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.foreground }]}>Due Date (Automated)</Text>
            <View style={styles.autoBadge}>
              <Feather name="zap" size={11} color="#eab308" />
              <Text style={styles.autoBadgeText}>Auto-Calculated</Text>
            </View>
          </View>

          {/* Quick Schedule Presets */}
          <View style={styles.presetsRow}>
            <Pressable
              onPress={() => handleSetPreset(0)}
              style={[
                styles.presetChip,
                isToday && styles.presetChipActive,
                { borderColor: isToday ? "#6366f1" : colors.border },
              ]}
            >
              <Text style={[styles.presetText, isToday && { color: "#6366f1", fontFamily: "Inter_600SemiBold" }]}>
                Today
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSetPreset(1)}
              style={[
                styles.presetChip,
                isTomorrow && styles.presetChipActive,
                { borderColor: isTomorrow ? "#6366f1" : colors.border },
              ]}
            >
              <Text style={[styles.presetText, isTomorrow && { color: "#6366f1", fontFamily: "Inter_600SemiBold" }]}>
                Tomorrow
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSetPreset(3)}
              style={[styles.presetChip, { borderColor: colors.border }]}
            >
              <Text style={styles.presetText}>+3 Days</Text>
            </Pressable>

            <Pressable
              onPress={() => handleSetPreset(7)}
              style={[styles.presetChip, { borderColor: colors.border }]}
            >
              <Text style={styles.presetText}>+1 Week</Text>
            </Pressable>

            <Pressable
              onPress={handleSetEndOfMonth}
              style={[styles.presetChip, { borderColor: colors.border }]}
            >
              <Text style={styles.presetText}>Month End</Text>
            </Pressable>
          </View>

          {/* Visual Date Card with Steppers */}
          <View style={[styles.dateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.dateIconWrap}>
              <Feather name="calendar" size={22} color="#6366f1" />
            </View>

            <View style={styles.dateDetails}>
              <Text style={[styles.dateFormatted, { color: colors.foreground }]}>
                {formatDisplayDate(dueDate)}
              </Text>
              <View style={styles.dateMetaRow}>
                <Text style={[styles.relativeTag, { color: "#22c55e" }]}>
                  {getRelativeDateLabel(dueDate)}
                </Text>
                <Text style={[styles.isoSubtext, { color: colors.mutedForeground }]}>
                  • {formatDateISO(dueDate)}
                </Text>
              </View>
            </View>

            {/* Steppers to quickly bump date up or down */}
            <View style={styles.stepperWrap}>
              <Pressable
                onPress={() => handleAdjustDays(-1)}
                style={({ pressed }) => [
                  styles.stepperBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                ]}
                hitSlop={8}
              >
                <Feather name="minus" size={16} color={colors.foreground} />
              </Pressable>

              <Pressable
                onPress={() => handleAdjustDays(1)}
                style={({ pressed }) => [
                  styles.stepperBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                ]}
                hitSlop={8}
              >
                <Feather name="plus" size={16} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Optional Time Presets */}
          <View style={styles.timePresetsRow}>
            {["Morning (9 AM)", "Afternoon (2 PM)", "5:00 PM (EOD)"].map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  } catch {}
                  setTimePreset(t);
                }}
                style={[
                  styles.timeChip,
                  timePreset === t && styles.timeChipActive,
                  { borderColor: timePreset === t ? "#6366f1" : colors.border },
                ]}
              >
                <Feather
                  name="clock"
                  size={12}
                  color={timePreset === t ? "#6366f1" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.timeChipText,
                    timePreset === t && { color: "#6366f1", fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Task Description ──────────────────────────────── */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.foreground }]}>Description & Instructions</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Describe what needs to be accomplished, detailed requirements, expectations, and any important notes..."
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* ── Submit Button ─────────────────────────────────── */}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: colors.accent,
              opacity: submitting ? 0.7 : pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Feather name="check-square" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Assign Task</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  assigneeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 22,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  activeDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#18181b",
  },
  assigneeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  assigneeName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  assigneeRole: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    color: "#6366f1",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  formGroup: {
    marginBottom: 22,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  autoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(234, 179, 8, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  autoBadgeText: {
    color: "#eab308",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  subLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  textArea: {
    minHeight: 125,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  sugChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  sugChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  priorityGrid: {
    flexDirection: "row",
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 13,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  presetChipActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  presetText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  dateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  dateDetails: {
    flex: 1,
    marginLeft: 14,
  },
  dateFormatted: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  dateMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  relativeTag: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  isoSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginLeft: 4,
  },
  stepperWrap: {
    flexDirection: "row",
    gap: 8,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  timePresetsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  timeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  timeChipActive: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
  },
  timeChipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#a1a1aa",
  },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
});
