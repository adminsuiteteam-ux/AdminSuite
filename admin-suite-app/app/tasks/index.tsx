import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
  Animated,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { apiService, getMediaUrl } from "@/services/api";

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "assigned" | "in_progress" | "completed";

interface TaskItem {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  due_date: string;
  created_at?: string;
  employee: number | { id: number; name: string; avatar?: string; role?: string };
}

const TASKS_CACHE_KEY = "@adminsuite_tasks_cache_v1";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgent", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.12)" },
  high: { label: "High", color: "#eab308", bg: "rgba(234, 179, 8, 0.12)" },
  medium: { label: "Medium", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)" },
  low: { label: "Low", color: "#71717a", bg: "rgba(113, 113, 122, 0.12)" },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  assigned: { label: "Assigned", color: "#71717a", icon: "clock" },
  in_progress: { label: "In Progress", color: "#6366f1", icon: "activity" },
  completed: { label: "Completed", color: "#10b981", icon: "check-circle" },
};

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { employees } = useData();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent && tasks.length === 0) setLoading(true);
    try {
      const res = await apiService.getTasks();
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setTasks(list);
      AsyncStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(list)).catch(() => {});
    } catch (err: any) {
      console.warn("[TasksScreen] Error loading tasks:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tasks.length]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(TASKS_CACHE_KEY);
        if (cached && mounted) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
            setLoading(false);
          }
        }
      } catch {}
      if (mounted) fetchTasks(true);
    })();
    return () => { mounted = false; };
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks(true);
  };

  const employeeMap = useMemo(() => {
    const map = new Map<number, any>();
    (employees || []).forEach((e: any) => {
      map.set(Number(e.id), e);
    });
    return map;
  }, [employees]);

  const getEmployeeInfo = useCallback((employeeField: any) => {
    if (typeof employeeField === "object" && employeeField !== null) {
      return {
        id: employeeField.id,
        name: employeeField.name || "Assigned Staff",
        avatar: employeeField.avatar,
        role: employeeField.role || "Staff Member",
      };
    }
    const empId = Number(employeeField);
    const found = employeeMap.get(empId);
    if (found) {
      return {
        id: found.id,
        name: found.name,
        avatar: found.avatar,
        role: found.role || "Staff Member",
      };
    }
    return {
      id: empId || 0,
      name: "Assigned Staff",
      avatar: null,
      role: "Team Member",
    };
  }, [employeeMap]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        searchQuery === "" ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getEmployeeInfo(t.employee).name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, employees]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const urgent = tasks.filter((t) => t.priority === "urgent" && t.status !== "completed").length;
    return { total, completed, inProgress, urgent };
  }, [tasks]);

  const handleUpdateStatus = async (taskId: number, currentStatus: Status) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextStatus: Status =
      currentStatus === "assigned"
        ? "in_progress"
        : currentStatus === "in_progress"
        ? "completed"
        : "assigned";

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );

    try {
      await apiService.updateTask(taskId, { status: nextStatus });
      showToast({
        title: "Task Status Updated",
        message: `Status moved to ${STATUS_CONFIG[nextStatus].label}`,
        type: "success",
      });
    } catch (err: any) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
      );
      showToast({
        title: "Update Failed",
        message: "Could not update task status on server.",
        type: "error",
      });
    }
  };

  const handleDeleteTask = (task: TaskItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
            try {
              await apiService.deleteTask(task.id);
              showToast({
                title: "Task Deleted",
                message: "The task was removed successfully.",
                type: "info",
              });
            } catch (err) {
              fetchTasks(true);
              showToast({
                title: "Delete Failed",
                message: "Could not delete task.",
                type: "error",
              });
            }
          },
        },
      ]
    );
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Missing Title", "Please enter a task title.");
      return;
    }
    if (!selectedEmployeeId && employees.length > 0) {
      Alert.alert("Select Employee", "Please choose an employee to assign this task to.");
      return;
    }

    setSubmitting(true);
    try {
      const empId = selectedEmployeeId || (employees[0] ? Number(employees[0].id) : 1);
      const res = await apiService.createTask({
        employee: empId,
        title: newTitle.trim(),
        description: newDescription.trim() || "No detailed instructions provided.",
        priority: newPriority,
        due_date: newDueDate,
        status: "assigned",
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        title: "Task Assigned",
        message: `Task assigned successfully!`,
        type: "success",
      });

      setModalVisible(false);
      setNewTitle("");
      setNewDescription("");
      setSelectedEmployeeId(null);
      fetchTasks(true);
    } catch (err: any) {
      Alert.alert("Creation Failed", err?.response?.data?.detail || "Could not create task.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Tasks</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Workplace operational tracking
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (employees.length > 0 && !selectedEmployeeId) {
              setSelectedEmployeeId(Number(employees[0].id));
            }
            setModalVisible(true);
          }}
          style={({ pressed }) => [
            styles.createBtn,
            { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.createBtnText}>New Task</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric Cards Row */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)" }]}>
              <Feather name="clipboard" size={16} color={colors.text} />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Total Tasks</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)" }]}>
              <Feather name="loader" size={16} color={colors.text} />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{stats.inProgress}</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>In Progress</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)" }]}>
              <Feather name="check-circle" size={16} color={colors.text} />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{stats.completed}</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Completed</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: colors.isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)" }]}>
              <Feather name="clock" size={16} color={colors.text} />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{stats.urgent}</Text>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Urgent</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search tasks or assignees..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: "all", label: "All Status" },
            { id: "assigned", label: "Assigned" },
            { id: "in_progress", label: "In Progress" },
            { id: "completed", label: "Completed" },
          ].map((f) => {
            const active = statusFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter(f.id);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.accent : colors.card,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? "#fff" : colors.textMuted, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium" },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}

          <View style={styles.filterDivider} />

          {[
            { id: "all", label: "All Priority" },
            { id: "urgent", label: "Urgent" },
            { id: "high", label: "High" },
            { id: "medium", label: "Medium" },
            { id: "low", label: "Low" },
          ].map((p) => {
            const active = priorityFilter === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPriorityFilter(p.id);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.accent : colors.card,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? "#fff" : colors.textMuted, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium" },
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Task List */}
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading workspace tasks...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.cardSelected }]}>
              <Feather name="check-square" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Tasks Found</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                ? "No tasks match your active filters. Try clearing filters."
                : "There are currently no tasks in your workspace. Assign your first task now!"}
            </Text>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={[styles.emptyActionBtn, { backgroundColor: colors.accent }]}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.emptyActionBtnText}>Create Task</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {filteredTasks.map((task) => {
              const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
              const sConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.assigned;
              const emp = getEmployeeInfo(task.employee);

              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: task.priority === "urgent" ? "rgba(239, 68, 68, 0.4)" : colors.border,
                    },
                  ]}
                >
                  {/* Card Header: Priority & Due Date */}
                  <View style={styles.taskCardTop}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.priorityBadge, { backgroundColor: pConfig.bg }]}>
                        <View style={[styles.priorityDot, { backgroundColor: pConfig.color }]} />
                        <Text style={[styles.priorityText, { color: pConfig.color }]}>{pConfig.label}</Text>
                      </View>

                      <Pressable
                        onPress={() => handleUpdateStatus(task.id, task.status)}
                        style={[styles.statusBadge, { borderColor: sConfig.color + "44", backgroundColor: sConfig.color + "14" }]}
                      >
                        <Feather name={sConfig.icon} size={11} color={sConfig.color} />
                        <Text style={[styles.statusText, { color: sConfig.color }]}>{sConfig.label}</Text>
                      </Pressable>
                    </View>

                    <Pressable onPress={() => handleDeleteTask(task)} hitSlop={10}>
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </Pressable>
                  </View>

                  {/* Task Title & Description */}
                  <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                  {task.description ? (
                    <Text style={[styles.taskDesc, { color: colors.textMuted }]} numberOfLines={3}>
                      {task.description}
                    </Text>
                  ) : null}

                  {/* Footer: Assignee & Due Date */}
                  <View style={[styles.taskFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.assigneeWrap}>
                      {emp.avatar ? (
                        <Image source={{ uri: getMediaUrl(emp.avatar) }} style={styles.assigneeAvatar} />
                      ) : (
                        <View style={[styles.assigneeAvatarFallback, { backgroundColor: colors.accent }]}>
                          <Text style={styles.assigneeInitials}>
                            {emp.name.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={[styles.assigneeName, { color: colors.text }]} numberOfLines={1}>
                          {emp.name}
                        </Text>
                        <Text style={[styles.assigneeRole, { color: colors.textMuted }]} numberOfLines={1}>
                          {emp.role}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dueDateWrap}>
                      <Feather name="calendar" size={12} color={colors.textMuted} />
                      <Text style={[styles.dueDateText, { color: colors.textMuted }]}>
                        {task.due_date || "No deadline"}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Task Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Assign New Task</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Specify objective, assignee & deadline
                </Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.border }]}
              >
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Title Input */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Task Title *</Text>
              <TextInput
                placeholder="e.g. Audit Branch Inventory"
                placeholderTextColor={colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />

              {/* Description Input */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Instructions / Notes</Text>
              <TextInput
                placeholder="Provide task specifics or checklists..."
                placeholderTextColor={colors.textMuted}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={3}
                style={[
                  styles.modalInput,
                  { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, height: 80, textAlignVertical: "top" },
                ]}
              />

              {/* Assignee Selection */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Assign To *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.employeePicker}>
                {employees.map((emp) => {
                  const empId = Number(emp.id);
                  const isSelected = selectedEmployeeId === empId;
                  return (
                    <Pressable
                      key={emp.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedEmployeeId(empId);
                      }}
                      style={[
                        styles.employeeChip,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.background,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.employeeChipText,
                          { color: isSelected ? "#fff" : colors.text, fontFamily: isSelected ? "Inter_700Bold" : "Inter_500Medium" },
                        ]}
                      >
                        {emp.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Priority Picker */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Priority Level</Text>
              <View style={styles.priorityRow}>
                {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                  const isSelected = newPriority === p;
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <Pressable
                      key={p}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setNewPriority(p);
                      }}
                      style={[
                        styles.prioritySelectBtn,
                        {
                          backgroundColor: isSelected ? cfg.color : colors.background,
                          borderColor: isSelected ? cfg.color : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.prioritySelectText,
                          { color: isSelected ? "#fff" : colors.text, fontFamily: isSelected ? "Inter_700Bold" : "Inter_500Medium" },
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Due Date Input */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Due Date (YYYY-MM-DD)</Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={newDueDate}
                onChangeText={setNewDueDate}
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleCreateTask}
                disabled={submitting}
                style={[styles.submitBtn, { backgroundColor: colors.accent, opacity: submitting ? 0.7 : 1 }]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Assign Task</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  metricVal: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  filterScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: 4,
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyActionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  taskCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  taskTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  taskDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  assigneeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  assigneeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  assigneeAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  assigneeInitials: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  assigneeName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  assigneeRole: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  dueDateWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dueDateText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  employeePicker: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  employeeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  employeeChipText: {
    fontSize: 12,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  prioritySelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  prioritySelectText: {
    fontSize: 12,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
