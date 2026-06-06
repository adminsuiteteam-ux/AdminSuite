import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
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

export default function EmployeeTasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"pending" | "completed">("pending");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Update task report state
  const [reportNote, setReportNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await apiService.getEmployeeDashboard();
      setTasks(res.data.tasks || []);
    } catch (err: any) {
      console.error("Failed to load tasks:", err);
      showToast({
        title: "Error",
        message: "Failed to load tasks. Please swipe down to refresh.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateStatus = async (status: "assigned" | "in_progress" | "completed") => {
    if (!selectedTask) return;
    setUpdating(true);
    try {
      const res = await apiService.updateEmployeeTask(selectedTask.id, {
        status,
        description: reportNote.trim() || undefined
      });
      
      const updatedTask = res.data.task;
      
      // Update local task list
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(null);
      setReportNote("");
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      showToast({
        title: "Task Updated",
        message: `Task status set to ${status.replace("_", " ")}.`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Failed to update task:", err);
      showToast({
        title: "Update Failed",
        message: err.message || "Failed to update task status.",
        type: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return colors.danger;
      case "medium": return colors.warning;
      default: return colors.success;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "in_progress": return "In Progress";
      default: return "To Do";
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === "pending") {
      return t.status !== "completed";
    }
    return t.status === "completed";
  });

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Task Management
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Execute assigned tasks and submit progress reports
        </Text>

        {/* Tab Filter */}
        <View style={[styles.tabContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            onPress={() => setFilter("pending")}
            style={[styles.tab, filter === "pending" && { backgroundColor: colors.background }]}
          >
            <Text style={[styles.tabText, { color: filter === "pending" ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Active Tasks
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter("completed")}
            style={[styles.tab, filter === "completed" && { backgroundColor: colors.background }]}
          >
            <Text style={[styles.tabText, { color: filter === "completed" ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Completed
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: tabBarPad, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 12 }}>
            {filteredTasks.map((t, idx) => (
              <FloatInView key={t.id} delay={idx * 50}>
                <Pressable
                  onPress={() => setSelectedTask(t)}
                  style={({ pressed }) => [
                    styles.taskCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={styles.taskCardHeader}>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(t.priority) + "15" }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(t.priority), fontFamily: "Inter_600SemiBold" }]}>
                        {t.priority.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.taskDue, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                      Due: {t.due_date}
                    </Text>
                  </View>
                  <Text style={[styles.taskTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {t.title}
                  </Text>
                  <Text style={[styles.taskDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                    {t.description}
                  </Text>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.taskFooter}>
                    <Feather name={t.status === "completed" ? "check-circle" : "clock"} size={13} color={colors.mutedForeground} />
                    <Text style={[styles.statusText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                      Status: {getStatusLabel(t.status)}
                    </Text>
                  </View>
                </Pressable>
              </FloatInView>
            ))}

            {filteredTasks.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="folder-open" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyStateText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  No tasks found in this section.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <Modal
          visible={!!selectedTask}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedTask(null)}
        >
          <Pressable style={styles.backdrop} onPress={() => setSelectedTask(null)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.handle} />
            <View style={styles.modalHeader}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedTask.priority) + "15" }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(selectedTask.priority), fontFamily: "Inter_600SemiBold" }]}>
                  {selectedTask.priority.toUpperCase()}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedTask(null)} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
            
            <ScrollView style={{ maxHeight: 350 }}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {selectedTask.title}
              </Text>
              <Text style={[styles.modalDate, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Due Date: {selectedTask.due_date} · Status: {getStatusLabel(selectedTask.status)}
              </Text>
              <Text style={[styles.modalDesc, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                {selectedTask.description}
              </Text>

              {/* Progress Report Section */}
              {selectedTask.status !== "completed" && (
                <View style={styles.reportSection}>
                  <Text style={[styles.reportLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                    Progress Report / Notes (Optional)
                  </Text>
                  <TextInput
                    value={reportNote}
                    onChangeText={setReportNote}
                    placeholder="Describe what work has been completed..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    style={[styles.reportInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, fontFamily: "Inter_500Medium" }]}
                  />
                </View>
              )}
            </ScrollView>

            {/* Action Row */}
            {selectedTask.status !== "completed" && (
              <View style={styles.actionRow}>
                {selectedTask.status === "assigned" && (
                  <Pressable
                    onPress={() => handleUpdateStatus("in_progress")}
                    disabled={updating}
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                      Start Working
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => handleUpdateStatus("completed")}
                  disabled={updating}
                  style={[styles.actionBtn, { backgroundColor: colors.success }]}
                >
                  <Text style={[styles.actionBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                    Submit Completion
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginTop: 16,
  },
  tab: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 13,
  },
  taskCard: {
    borderWidth: 1,
    padding: 16,
  },
  taskCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 9,
    letterSpacing: 0.2,
  },
  taskDue: {
    fontSize: 12,
  },
  taskTitle: {
    fontSize: 16,
    marginTop: 10,
  },
  taskDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
  },
  modalDate: {
    fontSize: 12,
    marginTop: 4,
  },
  modalDesc: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  reportSection: {
    marginTop: 20,
  },
  reportLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  reportInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 15,
  },
});
