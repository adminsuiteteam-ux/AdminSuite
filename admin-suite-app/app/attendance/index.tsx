import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";
import { getMediaUrl } from "@/services/api";

type AttendanceStatus = "present" | "late" | "on_leave" | "absent";

interface EmployeeAttendance {
  employeeId: number;
  status: AttendanceStatus;
  checkInTime?: string;
  notes?: string;
}

const STATUS_THEMES: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: keyof typeof Feather.glyphMap }> = {
  present: { label: "Present", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", icon: "check-circle" },
  late: { label: "Late", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", icon: "clock" },
  on_leave: { label: "On Leave", color: "#6366f1", bg: "rgba(99, 102, 241, 0.15)", icon: "calendar" },
  absent: { label: "Absent", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", icon: "x-circle" },
};

const STORAGE_KEY_RECORDS = "@adminsuite_attendance_records_v1";
const STORAGE_KEY_MY_PUNCH = "@adminsuite_my_punch_v1";

export default function AttendanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { employees } = useData();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Admin / User Punch Clock State
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);

  // Roster status map: employeeId -> EmployeeAttendance
  const [records, setRecords] = useState<Record<number, EmployeeAttendance>>({});

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load persisted punch & attendance state
  const loadAttendance = useCallback(async () => {
    try {
      const punchData = await AsyncStorage.getItem(STORAGE_KEY_MY_PUNCH);
      if (punchData) {
        const parsed = JSON.parse(punchData);
        setIsClockedIn(parsed.isClockedIn || false);
        setClockInTime(parsed.clockInTime || null);
        setClockOutTime(parsed.clockOutTime || null);
      }

      const recData = await AsyncStorage.getItem(STORAGE_KEY_RECORDS);
      if (recData) {
        setRecords(JSON.parse(recData));
      } else {
        // Initialize with default attendance for existing employees
        const initialMap: Record<number, EmployeeAttendance> = {};
        employees.forEach((emp, index) => {
          const empId = Number(emp.id);
          // Default: mostly present, some on leave or late
          if (emp.status === "on_leave") {
            initialMap[empId] = { employeeId: empId, status: "on_leave" };
          } else if (index % 5 === 3) {
            initialMap[empId] = { employeeId: empId, status: "late", checkInTime: "09:35 AM" };
          } else if (index % 7 === 6) {
            initialMap[empId] = { employeeId: empId, status: "absent" };
          } else {
            initialMap[empId] = { employeeId: empId, status: "present", checkInTime: "08:45 AM" };
          }
        });
        setRecords(initialMap);
      }
    } catch (e) {
      console.warn("Failed to load attendance records:", e);
    }
  }, [employees]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
  };

  // Handle Clock In / Clock Out
  const handleTogglePunch = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timeStr = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    if (!isClockedIn) {
      // Clocking IN
      setIsClockedIn(true);
      setClockInTime(timeStr);
      setClockOutTime(null);
      await AsyncStorage.setItem(
        STORAGE_KEY_MY_PUNCH,
        JSON.stringify({ isClockedIn: true, clockInTime: timeStr, clockOutTime: null })
      );
      showToast({
        title: "Clocked In",
        message: `Registered at ${timeStr}. Geofence verified.`,
        type: "success",
      });
    } else {
      // Clocking OUT
      setIsClockedIn(false);
      setClockOutTime(timeStr);
      await AsyncStorage.setItem(
        STORAGE_KEY_MY_PUNCH,
        JSON.stringify({ isClockedIn: false, clockInTime, clockOutTime: timeStr })
      );
      showToast({
        title: "Clocked Out",
        message: `Shift ended at ${timeStr}. Have a great rest!`,
        type: "info",
      });
    }
  };

  // Change individual employee attendance status
  const handleChangeEmployeeStatus = async (employeeId: number, newStatus: AttendanceStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = {
      ...records,
      [employeeId]: {
        employeeId,
        status: newStatus,
        checkInTime: newStatus === "present" || newStatus === "late" ? currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
      },
    };
    setRecords(updated);
    await AsyncStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(updated));
  };

  // Calculate high-level stats
  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let onLeave = 0;
    let absent = 0;

    employees.forEach((emp) => {
      const rec = records[Number(emp.id)];
      const status = rec ? rec.status : "present";
      if (status === "present") present++;
      else if (status === "late") late++;
      else if (status === "on_leave") onLeave++;
      else if (status === "absent") absent++;
    });

    const total = employees.length || 1;
    const rate = Math.round(((present + late) / total) * 100);

    return { present, late, onLeave, absent, total, rate };
  }, [employees, records]);

  // Filtered employees roster
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const empId = Number(emp.id);
      const rec = records[empId];
      const status = rec ? rec.status : "present";

      const matchesSearch =
        searchQuery === "" ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.role && emp.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = filterStatus === "all" || status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [employees, records, searchQuery, filterStatus]);

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Attendance</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Shift check-in & workplace presence
            </Text>
          </View>
        </View>

        <View style={styles.geofencePill}>
          <View style={styles.geofenceDot} />
          <Text style={styles.geofenceText}>GPS Verified</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Digital Punch Card */}
        <View style={[styles.punchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.punchCardHeader}>
            <View>
              <Text style={styles.punchDate}>
                {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
              </Text>
              <Text style={[styles.digitalClock, { color: colors.text }]}>
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </Text>
            </View>

            <View style={[styles.punchStatusBadge, { backgroundColor: isClockedIn ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)" }]}>
              <View style={[styles.punchStatusDot, { backgroundColor: isClockedIn ? "#10b981" : "#ef4444" }]} />
              <Text style={[styles.punchStatusText, { color: isClockedIn ? "#10b981" : "#ef4444" }]}>
                {isClockedIn ? "On Duty" : "Off Duty"}
              </Text>
            </View>
          </View>

          {/* Big Interactive Punch Button */}
          <Pressable
            onPress={handleTogglePunch}
            style={({ pressed }) => [
              styles.punchActionBtn,
              {
                backgroundColor: isClockedIn ? "#ef4444" : colors.accent,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Feather name={isClockedIn ? "log-out" : "log-in"} size={22} color="#fff" />
            <Text style={styles.punchActionBtnText}>
              {isClockedIn ? "Clock Out Now" : "Clock In (Geofenced)"}
            </Text>
          </Pressable>

          {/* Punch details row */}
          <View style={[styles.punchDetailsRow, { borderTopColor: colors.border }]}>
            <View style={styles.punchDetailCol}>
              <Text style={[styles.punchDetailLabel, { color: colors.textMuted }]}>Clocked In</Text>
              <Text style={[styles.punchDetailVal, { color: colors.text }]}>
                {clockInTime || "--:--"}
              </Text>
            </View>

            <View style={styles.punchDetailDivider} />

            <View style={styles.punchDetailCol}>
              <Text style={[styles.punchDetailLabel, { color: colors.textMuted }]}>Clocked Out</Text>
              <Text style={[styles.punchDetailVal, { color: colors.text }]}>
                {clockOutTime || "--:--"}
              </Text>
            </View>

            <View style={styles.punchDetailDivider} />

            <View style={styles.punchDetailCol}>
              <Text style={[styles.punchDetailLabel, { color: colors.textMuted }]}>Shift Status</Text>
              <Text style={[styles.punchDetailVal, { color: isClockedIn ? "#10b981" : colors.textMuted }]}>
                {isClockedIn ? "Active" : "Completed"}
              </Text>
            </View>
          </View>
        </View>

        {/* Daily Stats Overview */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
              <Feather name="user-check" size={16} color="#10b981" />
            </View>
            <Text style={[styles.statNumber, { color: "#10b981" }]}>{stats.present}</Text>
            <Text style={[styles.statTitle, { color: colors.textMuted }]}>Present</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
              <Feather name="clock" size={16} color="#f59e0b" />
            </View>
            <Text style={[styles.statNumber, { color: "#f59e0b" }]}>{stats.late}</Text>
            <Text style={[styles.statTitle, { color: colors.textMuted }]}>Late</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
              <Feather name="calendar" size={16} color="#6366f1" />
            </View>
            <Text style={[styles.statNumber, { color: "#6366f1" }]}>{stats.onLeave}</Text>
            <Text style={[styles.statTitle, { color: colors.textMuted }]}>On Leave</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrap, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Feather name="user-x" size={16} color="#ef4444" />
            </View>
            <Text style={[styles.statNumber, { color: "#ef4444" }]}>{stats.absent}</Text>
            <Text style={[styles.statTitle, { color: colors.textMuted }]}>Absent</Text>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Staff Presence Roster</Text>
          <Text style={[styles.attendanceRate, { color: colors.accent }]}>
            {stats.rate}% Attendance Rate
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search roster by name, role or email..."
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

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: "all", label: "All Staff" },
            { id: "present", label: "Present" },
            { id: "late", label: "Late" },
            { id: "on_leave", label: "On Leave" },
            { id: "absent", label: "Absent" },
          ].map((f) => {
            const active = filterStatus === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilterStatus(f.id);
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
        </ScrollView>

        {/* Staff Attendance List */}
        <View style={styles.rosterList}>
          {filteredEmployees.map((emp) => {
            const empId = Number(emp.id);
            const rec = records[empId] || { employeeId: empId, status: "present" as AttendanceStatus };
            const cfg = STATUS_THEMES[rec.status];

            return (
              <View
                key={emp.id}
                style={[styles.rosterCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.rosterCardTop}>
                  <View style={styles.empInfo}>
                    {emp.avatar ? (
                      <Image source={{ uri: getMediaUrl(emp.avatar) }} style={styles.empAvatar} />
                    ) : (
                      <View style={[styles.empAvatarFallback, { backgroundColor: colors.accent }]}>
                        <Text style={styles.empInitials}>{emp.name.slice(0, 2).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.empName, { color: colors.text }]} numberOfLines={1}>
                        {emp.name}
                      </Text>
                      <Text style={[styles.empRole, { color: colors.textMuted }]} numberOfLines={1}>
                        {emp.role || "Staff"} {rec.checkInTime ? `• In at ${rec.checkInTime}` : ""}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.empStatusBadge, { backgroundColor: cfg.bg }]}>
                    <Feather name={cfg.icon} size={12} color={cfg.color} />
                    <Text style={[styles.empStatusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Quick Status Setter for Admin */}
                <View style={[styles.statusSwitcherRow, { borderTopColor: colors.border }]}>
                  {(["present", "late", "on_leave", "absent"] as AttendanceStatus[]).map((st) => {
                    const isSelected = rec.status === st;
                    const stCfg = STATUS_THEMES[st];
                    return (
                      <Pressable
                        key={st}
                        onPress={() => handleChangeEmployeeStatus(empId, st)}
                        style={[
                          styles.switchBtn,
                          {
                            backgroundColor: isSelected ? stCfg.color : colors.background,
                            borderColor: isSelected ? stCfg.color : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.switchBtnText,
                            {
                              color: isSelected ? "#fff" : colors.textMuted,
                              fontFamily: isSelected ? "Inter_700Bold" : "Inter_500Medium",
                            },
                          ]}
                        >
                          {stCfg.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  geofencePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  geofenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  geofenceText: {
    color: "#10b981",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  punchCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  punchCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  punchDate: {
    fontSize: 12,
    color: "#8b5cf6",
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  digitalClock: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  punchStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  punchStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  punchStatusText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  punchActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  punchActionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  punchDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  punchDetailCol: {
    alignItems: "center",
    gap: 2,
  },
  punchDetailLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
  },
  punchDetailVal: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  punchDetailDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  statTitle: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  attendanceRate: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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
  rosterList: {
    gap: 10,
  },
  rosterCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  rosterCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  empInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  empAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  empAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  empInitials: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  empName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  empRole: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  empStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  empStatusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  statusSwitcherRow: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  switchBtnText: {
    fontSize: 10,
  },
});
