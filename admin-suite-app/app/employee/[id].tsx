import { FontAwesome6, Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState, useEffect } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import * as ImagePicker from "expo-image-picker";

import { FloatInView } from "@/components/FloatInView";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { getMediaUrl, apiService, appendFileToFormData } from "@/services/api";


const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e",
  on_leave: "#f97316",
  terminated: "#ef4444",
};

const PRIMARY_SOCIALS = [
  { key: "whatsapp", icon: "whatsapp", color: "#25D366", url: (v: string) => `https://wa.me/${v.replace(/\D/g, "")}` },
  { key: "facebook", icon: "facebook", color: "#1877F2", url: (v: string) => `https://facebook.com/${v}` },
  { key: "phone", icon: "phone", color: "#0ea5e9", url: (v: string) => `tel:${v}` },
  { key: "instagram", icon: "instagram", color: "#E4405F", url: (v: string) => `https://instagram.com/${v.replace("@", "")}` },
];

const EXTRA_SOCIALS = [
  { key: "linkedin", icon: "linkedin", color: "#0A66C2", url: (v: string) => `https://linkedin.com/in/${v}` },
  { key: "discord", icon: "discord", color: "#5865F2", url: (v: string) => `https://discord.com/users/${v}` },
  { key: "twitter", icon: "twitter", color: "#1DA1F2", url: (v: string) => `https://twitter.com/${v.replace("@", "")}` },
];

export default function EmployeeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { employees, refresh: refreshData } = useData();
  const { id } = useLocalSearchParams();
  const [refresh, setRefresh] = useState(0);
  const employee = employees.find((e: any) => String(e.id) === String(id));
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks"); // tasks, queries, leaves, messages, activity


  // Modals visibility state
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [docManagerOpen, setDocManagerOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [employeeNotes, setEmployeeNotes] = useState<Array<{ id: string; title: string; content: string; date: string }>>([]);

  useEffect(() => {
    if (id) {
      AsyncStorage.getItem(`@adminsuite_emp_notes_${id}`)
        .then((res) => {
          if (res) setEmployeeNotes(JSON.parse(res));
        })
        .catch(() => {});
    }
  }, [id]);

  const handleSaveEmpNote = async () => {
    if (!newNoteTitle.trim() && !newNoteContent.trim()) {
      Alert.alert("Error", "Please provide a note title or content.");
      return;
    }
    const newNote = {
      id: `emp-note-${Date.now()}`,
      title: newNoteTitle.trim() || "Staff Note",
      content: newNoteContent.trim(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    const updated = [newNote, ...employeeNotes];
    setEmployeeNotes(updated);
    if (id) {
      await AsyncStorage.setItem(`@adminsuite_emp_notes_${id}`, JSON.stringify(updated)).catch(() => {});
    }
    setNewNoteTitle("");
    setNewNoteContent("");
    setNoteModalOpen(false);
  };

  const handleDeleteEmpNote = async (noteId: string) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this employee note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = employeeNotes.filter((n) => n.id !== noteId);
          setEmployeeNotes(updated);
          if (id) {
            await AsyncStorage.setItem(`@adminsuite_emp_notes_${id}`, JSON.stringify(updated)).catch(() => {});
          }
        },
      },
    ]);
  };

  // Form input states
  const [submitting, setSubmitting] = useState(false);

  // Flag state
  const [flagReason, setFlagReason] = useState("Performance Issue");
  const [flagNote, setFlagNote] = useState("");

  // Query state
  const [queryType, setQueryType] = useState("Document Verification");
  const [queryMsg, setQueryMsg] = useState("");
  const [queryAttachment, setQueryAttachment] = useState<string | null>(null);

  // Promotion state
  const [promoRole, setPromoRole] = useState("");
  const [promoDept, setPromoDept] = useState("");
  const [promoAdjustSalary, setPromoAdjustSalary] = useState(false);

  // Salary adjustment state
  const [salaryAdjType, setSalaryAdjType] = useState("increment");
  const [salaryAdjAmt, setSalaryAdjAmt] = useState("");
  const [salaryAdjDate, setSalaryAdjDate] = useState("");
  const [salaryAdjNotes, setSalaryAdjNotes] = useState("");

  // Leave state
  const [leaveType, setLeaveType] = useState("Annual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");

  // Message state
  const [messageMode, setMessageMode] = useState("both");
  const [messageSub, setMessageSub] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageAttachment, setMessageAttachment] = useState<string | null>(null);

  // Document state
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("cv");
  const [docFileSelected, setDocFileSelected] = useState<string | null>(null);

  // Photo Lightbox & Avatar state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  // Inline Direct Edit Profile state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editOffice, setEditOffice] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPersonalEmail, setEditPersonalEmail] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setRefresh((r) => r + 1);
    }, [])
  );

  if (!employee) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.foreground }}>Employee not found</Text>
      </View>
    );
  }

  // Submit operations
  const handleFlagSubmit = async (isFlagging: boolean) => {
    try {
      setSubmitting(true);
      await apiService.flagEmployee(employee.id, {
        is_flagged: isFlagging,
        flag_reason: isFlagging ? flagReason : "",
        flag_note: flagNote,
      });
      await refreshData();
      setFlagModalOpen(false);
      setFlagNote("");
      Alert.alert("Success", isFlagging ? "Employee flagged successfully." : "Employee unflagged successfully.");
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to update flag status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuerySubmit = async () => {
    if (!queryMsg.trim()) return Alert.alert("Error", "Please enter a query message.");
    try {
      setSubmitting(true);
      const data = {
        employee: employee.id,
        query_type: queryType,
        message: queryMsg,
        status: "open",
      };
      await apiService.createQuery(data);
      await refreshData();
      setQueryModalOpen(false);
      setQueryMsg("");
      setQueryAttachment(null);
      Alert.alert("Success", "Query raised successfully.");
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to raise query.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoteSubmit = async () => {
    if (!promoRole.trim() || !promoDept.trim()) {
      return Alert.alert("Error", "Please fill in new role and department.");
    }
    try {
      setSubmitting(true);
      await apiService.patchEmployee(employee.id, {
        role: promoRole,
        department: promoDept,
      });
      
      // Log promotion activity log
      await apiService.patchEmployee(employee.id, {
        finance_data: {} // trigger save log trigger through patch or views
      });

      await refreshData();
      setPromoteModalOpen(false);
      
      if (promoAdjustSalary) {
        setPromoRole("");
        setPromoDept("");
        // Transition to salary adjustment modal
        setSalaryAdjAmt("");
        setSalaryAdjNotes(`Promotion adjustment to ${promoRole}`);
        setSalaryModalOpen(true);
      } else {
        setPromoRole("");
        setPromoDept("");
        Alert.alert("Success", "Employee promoted successfully.");
      }
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSalarySubmit = async () => {
    const amt = parseFloat(salaryAdjAmt);
    if (isNaN(amt) || amt <= 0) return Alert.alert("Error", "Please enter a valid amount.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(salaryAdjDate)) {
      return Alert.alert("Error", "Effective date must be in YYYY-MM-DD format.");
    }
    try {
      setSubmitting(true);
      await apiService.createSalaryAdjustment({
        employee: employee.id,
        adjustment_type: salaryAdjType,
        amount: amt,
        effective_date: salaryAdjDate,
        notes: salaryAdjNotes,
      });
      await refreshData();
      setSalaryModalOpen(false);
      setSalaryAdjAmt("");
      setSalaryAdjDate("");
      setSalaryAdjNotes("");
      Alert.alert("Success", "Salary adjusted successfully.");
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to adjust salary.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveSubmit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(leaveStart) || !/^\d{4}-\d{2}-\d{2}$/.test(leaveEnd)) {
      return Alert.alert("Error", "Dates must be in YYYY-MM-DD format.");
    }
    const start = new Date(leaveStart);
    const end = new Date(leaveEnd);
    if (start > end) return Alert.alert("Error", "Start date must be before end date.");
    
    // Auto-calculate duration days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    try {
      setSubmitting(true);
      await apiService.createLeave({
        employee: employee.id,
        leave_type: leaveType,
        start_date: leaveStart,
        end_date: leaveEnd,
        duration_days: diffDays,
        status: "scheduled",
      });
      await refreshData();
      setLeaveModalOpen(false);
      setLeaveStart("");
      setLeaveEnd("");
      Alert.alert("Success", "Leave scheduled successfully.");
    } catch (err: any) {
      console.warn(err);
      // Retrieve server overlap validation error
      const msg = err.response?.data?.detail || err.response?.data?.[0] || "Failed to schedule leave. Overlapping dates.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMessageSubmit = async () => {
    if (!messageSub.trim() || !messageBody.trim()) {
      return Alert.alert("Error", "Please fill in all fields.");
    }
    if ((messageMode === "whatsapp" || messageMode === "sms") && !employee.phone) {
      return Alert.alert("Error", "Employee does not have a phone number configured.");
    }
    try {
      setSubmitting(true);
      await apiService.createMessage({
        employee: employee.id,
        subject: messageSub,
        body: messageBody,
        delivery_mode: messageMode,
      });
      await refreshData();
      setMessageModalOpen(false);

      if (messageMode === "whatsapp") {
        const url = `https://wa.me/${employee.phone.replace(/\D/g, "")}?text=${encodeURIComponent(messageBody)}`;
        Linking.openURL(url).catch(() => {
          Alert.alert("Error", "Failed to open WhatsApp.");
        });
      } else if (messageMode === "sms") {
        const separator = Platform.OS === "ios" ? "&" : "?";
        const url = `sms:${employee.phone}${separator}body=${encodeURIComponent(messageBody)}`;
        Linking.openURL(url).catch(() => {
          Alert.alert("Error", "Failed to open SMS messenger.");
        });
      }

      setMessageSub("");
      setMessageBody("");
      setMessageAttachment(null);
      Alert.alert("Success", `Message sent via ${messageMode.replace("_", "-").toUpperCase()}`);
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveToggle = async () => {
    try {
      setSubmitting(true);
      if (employee.is_archived) {
        await apiService.restoreEmployee(employee.id);
        Alert.alert("Success", "Employee profile restored.");
      } else {
        await apiService.archiveEmployee(employee.id);
        Alert.alert("Success", "Employee profile archived.");
      }
      await refreshData();
      setArchiveModalOpen(false);
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to update profile archiving status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDocument = async () => {
    if (!docName.trim()) return Alert.alert("Error", "Please enter a document name.");
    
    // Simulate File Upload using standard multipart form data
    const formData = new FormData();
    formData.append("employee", String(employee.id));
    formData.append("name", docName);
    formData.append("document_type", docType);
    
    if (Platform.OS === "web") {
      const blob = new Blob(["mock content"], { type: "application/pdf" });
      formData.append("file", blob, docFileSelected || `${docName.replace(/\s+/g, "_").toLowerCase()}.pdf`);
    } else {
      formData.append("file", {
        uri: Platform.OS === "android" ? "file:///data/user/0/mock.txt" : "file:///mock.txt",
        name: docFileSelected || `${docName.replace(/\s+/g, "_").toLowerCase()}.pdf`,
        type: "application/pdf"
      } as any);
    }

    try {
      setSubmitting(true);
      await apiService.createDocument(formData);
      await refreshData();
      setDocName("");
      setDocFileSelected(null);
      Alert.alert("Success", "Document added successfully.");
    } catch (err) {
      console.warn(err);
      Alert.alert("Error", "Failed to add document.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this document?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);
              await apiService.deleteDocument(docId);
              await refreshData();
              Alert.alert("Success", "Document deleted.");
            } catch (err) {
              console.warn(err);
              Alert.alert("Error", "Failed to delete document.");
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const fin = employee.finance || {};
  const currentPay = Number(fin.current_pay ?? fin.currentPay ?? employee.salary ?? 0);
  const employeeOwesCompany = Number(fin.employee_owes_company ?? fin.employeeOwesCompany ?? 0);
  const companyOwesEmployee = Number(fin.company_owes_employee ?? fin.companyOwesEmployee ?? 0);
  const shares = Number(fin.shares ?? 0);
  const bonuses = Number(fin.bonuses ?? 0);
  const deductions = Number(fin.deductions ?? 0);

  const statusLabel = employee.status === "on_leave" ? "ON LEAVE" : employee.status === "terminated" ? "INACTIVE" : employee.status.toUpperCase();

  const open = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const handlePickAvatar = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Needed", "Camera permission is required to capture a photo.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Needed", "Media library permission is required to pick a photo.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setUpdatingAvatar(true);
        const pickedUri = result.assets[0].uri;
        const formData = new FormData();
        await appendFileToFormData(formData, "avatar", pickedUri);
        await apiService.patchEmployee(employee.id, formData);
        await refreshData();
        Alert.alert("Success", "Profile photo updated successfully!");
        setPhotoModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to update avatar:", err);
      Alert.alert("Error", "Failed to update profile photo.");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const onEdit = () => {
    setEditName(employee.name || "");
    setEditRole(employee.role || "");
    setEditDepartment(employee.department || "");
    setEditOffice(employee.office || "");
    setEditLocation(employee.location || "");
    setEditPhone(employee.phone || "");
    setEditPersonalEmail(employee.personal_email || "");
    setEditBio(employee.bio || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      return Alert.alert("Required", "Please enter the employee's name.");
    }
    try {
      setSavingEdit(true);
      const payload: Record<string, any> = {
        name: editName.trim(),
        role: editRole.trim(),
        department: editDepartment.trim(),
        office: editOffice.trim(),
        location: editLocation.trim(),
        phone: editPhone.trim(),
        personal_email: editPersonalEmail.trim(),
        bio: editBio.trim(),
      };
      await apiService.patchEmployee(employee.id, payload);
      await refreshData();
      setEditModalOpen(false);
      Alert.alert("Success", "Employee profile updated successfully!");
    } catch (err: any) {
      console.error("Failed to update employee:", err);
      Alert.alert("Error", err?.response?.data?.detail || "Failed to update employee profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  const socialButtons: { icon: string; onPress: () => void }[] = [];
  PRIMARY_SOCIALS.forEach((s) => {
    if (s.key === "phone") {
      socialButtons.push({ icon: s.icon, onPress: () => open(`tel:${employee.phone}`) });
    } else {
      const handle = Object.entries(employee.socials || {}).find(([k]) => k === s.key)?.[1] as string | undefined;
      if (handle) socialButtons.push({ icon: s.icon, onPress: () => open(s.url(handle)) });
    }
  });
  EXTRA_SOCIALS.forEach((s) => {
    const handle = Object.entries(employee.socials || {}).find(([k]) => k === s.key)?.[1] as string | undefined;
    if (handle) socialButtons.push({ icon: s.icon, onPress: () => open(s.url(handle)) });
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140, paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page title ────────────────────────────────── */}
        <View style={styles.pageTitleRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="chevron-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Profile
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ══════════════════════════════════════════════════
            PROFILE CARD — dark gradient, matching screenshot
           ══════════════════════════════════════════════════ */}
        <FloatInView>
          <View style={styles.profileCard}>
            <LinearGradient
              colors={["#0a0f1e", "#111d42", "#3b28cc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            />

            {/* Top row: Avatar + Edit button */}
            <View style={styles.cardTopRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  onPress={() => setPhotoModalOpen(true)}
                  style={({ pressed }) => [styles.avatarRing, { opacity: pressed ? 0.85 : 1 }]}
                  hitSlop={8}
                >
                  <Image source={{ uri: getMediaUrl(employee.avatar) }} style={styles.avatar} />
                  <View style={styles.avatarCameraBadge}>
                    <Feather name="camera" size={11} color="#fff" />
                  </View>
                </Pressable>
                {employee.is_flagged && (
                  <View style={{ backgroundColor: "#ef4444", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="flag" size={12} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 }}>FLAGGED</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={onEdit}
                style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="edit-2" size={14} color="#fff" />
                <Text style={[styles.editText, { fontFamily: "Inter_600SemiBold" }]}>Edit</Text>
              </Pressable>
            </View>

            {/* Name */}
            <Text style={[styles.cardName, { fontFamily: "Inter_700Bold" }]}>
              {employee.name}
            </Text>

            {/* Role chip */}
            <View style={styles.roleChip}>
              <Feather name="shield" size={12} color="#fff" />
              <Text style={[styles.roleChipText, { fontFamily: "Inter_600SemiBold" }]}>
                {employee.role.toUpperCase()}
              </Text>
            </View>

            {/* Bio */}
            <Text style={[styles.cardBio, { fontFamily: "Inter_400Regular" }]}>
              {employee.bio}
            </Text>

            {/* Divider */}
            <View style={styles.cardDivider} />

            {/* Contact rows */}
            <View style={styles.contactRow}>
              <Feather name="shield" size={16} color="rgba(255,255,255,0.7)" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Inter_500Medium" }}>Company Login Email</Text>
                <Text style={[styles.contactText, { fontFamily: "Inter_500Medium" }]}>{employee.email}</Text>
              </View>
            </View>
            {employee.personal_email ? (
              <View style={styles.contactRow}>
                <Feather name="mail" size={16} color="rgba(255,255,255,0.7)" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Inter_500Medium" }}>Personal / Gmail</Text>
                  <Text style={[styles.contactText, { fontFamily: "Inter_500Medium" }]}>{employee.personal_email}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.contactRow}>
              <Feather name="phone" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.contactText, { fontFamily: "Inter_500Medium" }]}>{employee.phone}</Text>
            </View>
            <View style={styles.contactRow}>
              <Feather name="map-pin" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.contactText, { fontFamily: "Inter_500Medium" }]}>{employee.location}</Text>
            </View>
          </View>
        </FloatInView>



        {/* ── Quick contact ─────────────────────────────── */}
        <FloatInView delay={120}>
          <Section title="Quick contact">
            <View style={styles.socialRow}>
              {socialButtons.map((btn, idx) => (
                <SocialIconBtn
                  key={idx}
                  icon={btn.icon}
                  onPress={btn.onPress}
                />
              ))}
            </View>
          </Section>
        </FloatInView>

        {/* ── Stats row ─────────────────────────────────── */}
        <FloatInView delay={180}>
          <Section title="Overview">
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Feather name="dollar-sign" size={16} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{fmt(employee.salary)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>SALARY</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Feather name="briefcase" size={16} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>{employee.office}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>OFFICE</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Feather name="star" size={16} color="#f59e0b" />
                <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{"★".repeat(employee.performance)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>RATING</Text>
              </View>
            </View>
          </Section>
        </FloatInView>

        {/* ── Manage ────────────────────────────────────── */}
        <FloatInView delay={240}>
          <Section title="Manage">
            <View style={styles.manageGrid}>
              <ManageBtn icon="flag" label={employee.is_flagged ? "Unflag" : "Flag"} onPress={() => setFlagModalOpen(true)} />
              <ManageBtn icon="alert-circle" label="Query" onPress={() => setQueryModalOpen(true)} />
              <ManageBtn
                icon="check-square"
                label="Give task"
                onPress={() =>
                  router.push({
                    pathname: "/employee/assign-task" as any,
                    params: {
                      employeeId: String(employee.id),
                      employeeName: employee.name,
                      employeeRole: employee.role,
                      employeeAvatar: employee.avatar || "",
                    },
                  })
                }
              />
              <ManageBtn icon="edit-3" label="Edit" onPress={onEdit} />
              <ManageBtn icon="trash-2" label="Delete" onPress={() => {
                Alert.alert("Confirm Delete", `Are you sure you want to delete ${employee.name}?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: async () => {
                    try { await apiService.deleteEmployee(employee.id); await refreshData(); router.back(); } catch { Alert.alert("Error", "Failed to delete."); }
                  }},
                ]);
              }} />
              <ManageBtn icon="more-horizontal" label="More" onPress={() => setMoreOpen((v) => !v)} />
            </View>
            {moreOpen && (
              <View style={[styles.moreCard, { backgroundColor: colors.isDark ? "#18181c" : "#ffffff", borderColor: colors.border, borderRadius: colors.radius }]}>
                <MoreRow icon="award" label="Promote" onPress={() => { setMoreOpen(false); setPromoteModalOpen(true); }} />
                <MoreRow icon="dollar-sign" label="Adjust salary" onPress={() => { setMoreOpen(false); setSalaryModalOpen(true); }} />
                <MoreRow icon="calendar" label="Schedule leave" onPress={() => { setMoreOpen(false); setLeaveModalOpen(true); }} />
                <MoreRow icon="send" label="Send message" onPress={() => { setMoreOpen(false); setMessageModalOpen(true); }} />
                <MoreRow icon="archive" label={employee.is_archived ? "Restore" : "Archive"} onPress={() => { setMoreOpen(false); setArchiveModalOpen(true); }} last />
              </View>
            )}
          </Section>
        </FloatInView>

        {/* ── Financial summary ─────────────────────────── */}
        <FloatInView delay={300}>
          <Section title="Financial record">
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <DetailRow icon="dollar-sign" label="Current pay" value={fmt(isNaN(currentPay) ? 0 : currentPay)} />
              {employeeOwesCompany > 0 && (
                <DetailRow icon="alert-circle" label="Employee owes company" value={fmt(isNaN(employeeOwesCompany) ? 0 : employeeOwesCompany)} valueColor="#ef4444" />
              )}
              {companyOwesEmployee > 0 && (
                <DetailRow icon="alert-triangle" label="Company owes employee" value={fmt(isNaN(companyOwesEmployee) ? 0 : companyOwesEmployee)} valueColor="#22c55e" />
              )}
              <DetailRow icon="bar-chart-2" label="Company shares" value={shares > 0 ? `${shares}%` : "None"} />
              <DetailRow icon="gift" label="Bonuses" value={fmt(isNaN(bonuses) ? 0 : bonuses)} />
              <DetailRow icon="minus-circle" label="Deductions" value={fmt(isNaN(deductions) ? 0 : deductions)} last />
            </View>
            <Pressable
              onPress={() => router.push(`/employee/finance?id=${employee.id}` as any)}
              style={({ pressed }) => [
                styles.financeLink,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="file-text" size={16} color={colors.accent} />
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 }}>View full financial record</Text>
              <Feather name="chevron-right" size={16} color={colors.accent} />
            </Pressable>
          </Section>
        </FloatInView>

        {/* ── Documents ─────────────────────────────────── */}
        <FloatInView delay={360}>
          <Section title="Documents">
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {(employee.documents && employee.documents.length > 0) ? employee.documents.map((doc: any, i: number) => (
                <View key={doc.id} style={[styles.detailRow, i < employee.documents.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  <View style={[styles.detailIcon, { backgroundColor: colors.muted }]}>
                    <Feather name="file" size={14} color={colors.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{doc.name}</Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
                      {doc.document_type?.replace(/_/g, " ").toUpperCase()} · {new Date(doc.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDeleteDocument(doc.id)} hitSlop={8}>
                    <Feather name="trash-2" size={16} color="#ef4444" />
                  </Pressable>
                </View>
              )) : (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>No documents uploaded yet</Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => setDocManagerOpen(true)}
              style={({ pressed }) => [
                styles.financeLink,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="plus" size={16} color={colors.accent} />
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 }}>Add document</Text>
              <Feather name="chevron-right" size={16} color={colors.accent} />
            </Pressable>
          </Section>
        </FloatInView>

        {/* ── Administrative Logs ──────────────────────── */}
        <FloatInView delay={420}>
          <Section title="Administrative logs">
            {/* Tab bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {(["tasks", "notebook", "queries", "leaves", "messages", "activity"] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[
                      styles.tabChip,
                      { backgroundColor: activeTab === tab ? colors.accent : colors.muted, borderRadius: colors.radius },
                    ]}
                  >
                    <Text style={{ color: activeTab === tab ? "#fff" : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "capitalize" }}>
                      {tab}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Tab content */}
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {activeTab === "tasks" && (
                (employee.tasks?.length > 0) ? employee.tasks.map((t: any, i: number) => (
                  <View key={t.id} style={[styles.logRow, i < employee.tasks.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <View style={[styles.logIcon, { backgroundColor: t.status === "completed" ? "#22c55e1A" : t.priority === "high" ? "#ef44441A" : "#3b82f61A" }]}>
                      <Feather name={t.status === "completed" ? "check-circle" : "clock"} size={14} color={t.status === "completed" ? "#22c55e" : t.priority === "high" ? "#ef4444" : "#3b82f6"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{t.title}</Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
                        Due: {t.due_date} · {t.status?.replace(/_/g, " ")} · {t.priority}
                      </Text>
                    </View>
                  </View>
                )) : <EmptyLog label="No tasks assigned" />
              )}

              {activeTab === "notebook" && (
                <View style={{ padding: 4 }}>
                  <Pressable
                    onPress={() => setNoteModalOpen(true)}
                    style={({ pressed }) => [
                      styles.financeLink,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: colors.radius,
                        marginBottom: 10,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Feather name="plus" size={16} color={colors.accent} />
                    <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 }}>
                      Add note for {employee.name?.split(" ")[0]}
                    </Text>
                    <Feather name="chevron-right" size={16} color={colors.accent} />
                  </Pressable>

                  {employeeNotes.length > 0 ? (
                    employeeNotes.map((n, i) => (
                      <View
                        key={n.id}
                        style={[
                          styles.logRow,
                          i < employeeNotes.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <View style={[styles.logIcon, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
                          <Feather name="book-open" size={14} color={colors.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                            {n.title}
                          </Text>
                          {n.content ? (
                            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                              {n.content}
                            </Text>
                          ) : null}
                          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 4 }}>
                            {n.date}
                          </Text>
                        </View>
                        <Pressable onPress={() => handleDeleteEmpNote(n.id)} hitSlop={10}>
                          <Feather name="trash-2" size={15} color="#ef4444" />
                        </Pressable>
                      </View>
                    ))
                  ) : (
                    <EmptyLog label="No employee notes recorded yet" />
                  )}
                </View>
              )}

              {activeTab === "queries" && (
                (employee.queries?.length > 0) ? employee.queries.map((q: any, i: number) => (
                  <View key={q.id} style={[styles.logRow, i < employee.queries.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <View style={[styles.logIcon, { backgroundColor: q.status === "resolved" ? "#22c55e1A" : "#eab3081A" }]}>
                      <Feather name={q.status === "resolved" ? "check-circle" : "alert-circle"} size={14} color={q.status === "resolved" ? "#22c55e" : "#eab308"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{q.query_type?.replace(/_/g, " ")}</Text>
                      <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>{q.message}</Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 2 }}>{q.status} · {new Date(q.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                )) : <EmptyLog label="No queries raised" />
              )}

              {activeTab === "leaves" && (
                (employee.leaves?.length > 0) ? employee.leaves.map((l: any, i: number) => (
                  <View key={l.id} style={[styles.logRow, i < employee.leaves.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <View style={[styles.logIcon, { backgroundColor: "#8b5cf61A" }]}>
                      <Feather name="calendar" size={14} color="#8b5cf6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{l.leave_type} Leave</Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
                        {l.start_date} → {l.end_date} ({l.duration_days}d) · {l.status}
                      </Text>
                    </View>
                  </View>
                )) : <EmptyLog label="No leaves recorded" />
              )}

              {activeTab === "messages" && (
                (employee.messages?.length > 0) ? employee.messages.map((m: any, i: number) => (
                  <View key={m.id} style={[styles.logRow, i < employee.messages.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <View style={[styles.logIcon, { backgroundColor: "#0ea5e91A" }]}>
                      <Feather name="send" size={14} color="#0ea5e9" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{m.subject}</Text>
                      <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>{m.body}</Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 2 }}>via {m.delivery_mode} · {new Date(m.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                )) : <EmptyLog label="No messages sent" />
              )}

              {activeTab === "activity" && (
                (employee.activity_logs?.length > 0) ? employee.activity_logs.map((a: any, i: number) => (
                  <View key={a.id} style={[styles.logRow, i < employee.activity_logs.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <View style={[styles.logIcon, { backgroundColor: "#64748b1A" }]}>
                      <Feather name="activity" size={14} color="#64748b" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{a.action}</Text>
                      <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>{a.details}</Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 2 }}>{new Date(a.created_at).toLocaleString()}</Text>
                    </View>
                  </View>
                )) : <EmptyLog label="No activity logged" />
              )}
            </View>
          </Section>
        </FloatInView>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════
          MODALS
         ═══════════════════════════════════════════════════ */}

      {/* ── Employee Note Modal ──────────────────────────── */}
      <AdminModal visible={noteModalOpen} onClose={() => setNoteModalOpen(false)} title={`Staff Note · ${employee.name?.split(" ")[0] || "Employee"}`}>
        <ModalLabel text="Title / Subject" />
        <ModalInput value={newNoteTitle} onChangeText={setNewNoteTitle} placeholder="e.g. 1-on-1 Review, Goals, Observation" />
        <ModalLabel text="Notes / Discussion Details" />
        <ModalInput value={newNoteContent} onChangeText={setNewNoteContent} placeholder="Write confidential notes or feedback..." multiline />
        <ModalBtn label="Save to Notebook" color={colors.accent} loading={false} onPress={handleSaveEmpNote} />
      </AdminModal>

      {/* ── Flag / Unflag Modal ──────────────────────────── */}
      <AdminModal visible={flagModalOpen} onClose={() => setFlagModalOpen(false)} title={employee.is_flagged ? "Unflag Employee" : "Flag Employee"}>
        {employee.is_flagged ? (
          <>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 8 }}>
              Currently flagged: <Text style={{ fontFamily: "Inter_700Bold", color: "#ef4444" }}>{employee.flag_reason}</Text>
            </Text>
            {employee.flag_note ? <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 16 }}>Note: {employee.flag_note}</Text> : null}
            <ModalBtn label="Remove Flag" color="#22c55e" loading={submitting} onPress={() => handleFlagSubmit(false)} />
          </>
        ) : (
          <>
            <ModalLabel text="Reason" />
            <ModalPicker
              options={["Performance Issue", "Attendance Problem", "Policy Violation", "Pending Review", "Other"]}
              value={flagReason}
              onChange={setFlagReason}
            />
            <ModalLabel text="Note (optional)" />
            <ModalInput value={flagNote} onChangeText={setFlagNote} placeholder="Add a note..." multiline />
            <ModalBtn label="Flag Employee" color="#f97316" loading={submitting} onPress={() => handleFlagSubmit(true)} />
          </>
        )}
      </AdminModal>

      {/* ── Query Modal ──────────────────────────────────── */}
      <AdminModal visible={queryModalOpen} onClose={() => setQueryModalOpen(false)} title="Raise Query">
        <ModalLabel text="Query Type" />
        <ModalPicker
          options={["Document Verification", "Conduct Inquiry", "Payroll Discrepancy", "Attendance Clarification", "Other"]}
          value={queryType}
          onChange={setQueryType}
        />
        <ModalLabel text="Message" />
        <ModalInput value={queryMsg} onChangeText={setQueryMsg} placeholder="Describe the query..." multiline />
        <ModalBtn label="Submit Query" color="#eab308" loading={submitting} onPress={handleQuerySubmit} />
      </AdminModal>

      {/* ── Promote Modal ────────────────────────────────── */}
      <AdminModal visible={promoteModalOpen} onClose={() => setPromoteModalOpen(false)} title="Promote Employee">
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 16 }}>
          Current: {employee.role} · {employee.department}
        </Text>
        <ModalLabel text="New Role" />
        <ModalInput value={promoRole} onChangeText={setPromoRole} placeholder="e.g. Senior Developer" />
        <ModalLabel text="New Department" />
        <ModalInput value={promoDept} onChangeText={setPromoDept} placeholder="e.g. Engineering" />
        <Pressable onPress={() => setPromoAdjustSalary(!promoAdjustSalary)} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <View style={[styles.checkbox, promoAdjustSalary && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
            {promoAdjustSalary && <Feather name="check" size={14} color="#fff" />}
          </View>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>Also adjust salary</Text>
        </Pressable>
        <ModalBtn label="Promote" color="#8b5cf6" loading={submitting} onPress={handlePromoteSubmit} />
      </AdminModal>

      {/* ── Salary Adjustment Modal ──────────────────────── */}
      <AdminModal visible={salaryModalOpen} onClose={() => setSalaryModalOpen(false)} title="Adjust Salary">
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 16 }}>
          Current salary: {fmt(employee.salary)}
        </Text>
        <ModalLabel text="Type" />
        <ModalPicker options={["increment", "decrement", "bonus", "deduction"]} value={salaryAdjType} onChange={setSalaryAdjType} />
        <ModalLabel text="Amount" />
        <ModalInput value={salaryAdjAmt} onChangeText={setSalaryAdjAmt} placeholder="5000" keyboardType="numeric" />
        <ModalLabel text="Effective Date (YYYY-MM-DD)" />
        <ModalInput value={salaryAdjDate} onChangeText={setSalaryAdjDate} placeholder="2026-02-01" />
        <ModalLabel text="Notes (optional)" />
        <ModalInput value={salaryAdjNotes} onChangeText={setSalaryAdjNotes} placeholder="Reason for adjustment..." multiline />
        <ModalBtn label="Apply Adjustment" color="#2563eb" loading={submitting} onPress={handleSalarySubmit} />
      </AdminModal>

      {/* ── Schedule Leave Modal ──────────────────────────── */}
      <AdminModal visible={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} title="Schedule Leave">
        <ModalLabel text="Leave Type" />
        <ModalPicker options={["Annual", "Sick", "Maternity", "Paternity", "Unpaid", "Other"]} value={leaveType} onChange={setLeaveType} />
        <ModalLabel text="Start Date (YYYY-MM-DD)" />
        <ModalInput value={leaveStart} onChangeText={setLeaveStart} placeholder="2026-03-01" />
        <ModalLabel text="End Date (YYYY-MM-DD)" />
        <ModalInput value={leaveEnd} onChangeText={setLeaveEnd} placeholder="2026-03-15" />
        <ModalBtn label="Schedule Leave" color="#8b5cf6" loading={submitting} onPress={handleLeaveSubmit} />
      </AdminModal>

      {/* ── Send Message Modal ───────────────────────────── */}
      <AdminModal visible={messageModalOpen} onClose={() => setMessageModalOpen(false)} title="Send Message">
        <ModalLabel text="Delivery Mode" />
        <ModalPicker options={["both", "in_app", "email", "whatsapp", "sms"]} value={messageMode} onChange={setMessageMode} />
        <ModalLabel text="Subject" />
        <ModalInput value={messageSub} onChangeText={setMessageSub} placeholder="Message subject" />
        <ModalLabel text="Body" />
        <ModalInput value={messageBody} onChangeText={setMessageBody} placeholder="Write your message..." multiline />
        <ModalBtn label="Send Message" color="#0ea5e9" loading={submitting} onPress={handleMessageSubmit} />
      </AdminModal>

      {/* ── Archive / Restore Modal ──────────────────────── */}
      <AdminModal visible={archiveModalOpen} onClose={() => setArchiveModalOpen(false)} title={employee.is_archived ? "Restore Employee" : "Archive Employee"}>
        <View style={{ alignItems: "center", paddingVertical: 8 }}>
          <View style={[styles.archiveIconWrap, { backgroundColor: employee.is_archived ? "#22c55e1A" : "#ef44441A" }]}>
            <Feather name={employee.is_archived ? "refresh-cw" : "archive"} size={32} color={employee.is_archived ? "#22c55e" : "#ef4444"} />
          </View>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 12, textAlign: "center" }}>
            {employee.is_archived
              ? `Restore ${employee.name}'s profile?`
              : `Archive ${employee.name}'s profile?`}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 8, textAlign: "center", paddingHorizontal: 8 }}>
            {employee.is_archived
              ? "This will make the employee visible in active lists again."
              : "Archived employees are hidden from active lists but their data is preserved."}
          </Text>
        </View>
        <ModalBtn
          label={employee.is_archived ? "Restore Profile" : "Archive Profile"}
          color={employee.is_archived ? "#22c55e" : "#ef4444"}
          loading={submitting}
          onPress={handleArchiveToggle}
        />
      </AdminModal>

      {/* ── Document Manager Modal ───────────────────────── */}
      <AdminModal visible={docManagerOpen} onClose={() => setDocManagerOpen(false)} title="Add Document">
        <ModalLabel text="Document Name" />
        <ModalInput value={docName} onChangeText={setDocName} placeholder="e.g. Employment Contract" />
        <ModalLabel text="Document Type" />
        <ModalPicker options={["cv", "contract", "id_document", "certificate", "other"]} value={docType} onChange={setDocType} />
        <View style={[styles.filePickerBox, { borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="upload-cloud" size={24} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 6 }}>
            {docFileSelected || "Tap to select a file"}
          </Text>
        </View>
        <ModalBtn label="Upload Document" color="#2563eb" loading={submitting} onPress={handleAddDocument} />
      </AdminModal>

      {/* ── Photo Lightbox Modal ── */}
      <Modal visible={photoModalOpen} animationType="fade" transparent onRequestClose={() => !updatingAvatar && setPhotoModalOpen(false)}>
        <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => !updatingAvatar && setPhotoModalOpen(false)} />
            <View style={[styles.photoModalCard, { backgroundColor: colors.isDark ? "#18181c" : "#ffffff", borderColor: colors.border }]}>
              <View style={styles.photoModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.photoModalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    Profile Photo
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium" }}>
                    {employee.name}
                  </Text>
                </View>
                <Pressable
                  onPress={() => !updatingAvatar && setPhotoModalOpen(false)}
                  hitSlop={10}
                  style={styles.photoModalCloseBtn}
                >
                  <Feather name="x" size={20} color={colors.foreground} />
                </Pressable>
              </View>

              {/* Square photo display */}
              <View style={styles.photoPreviewWrapper}>
                <Image
                  source={{ uri: getMediaUrl(employee.avatar) }}
                  style={styles.photoPreviewSquare}
                  resizeMode="cover"
                />
                {updatingAvatar && (
                  <View style={styles.photoUpdatingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 8 }}>
                      Updating photo...
                    </Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 18, width: "100%" }}>
                <Pressable
                  onPress={() => handlePickAvatar(false)}
                  disabled={updatingAvatar}
                  style={({ pressed }) => [
                    styles.photoActionBtn,
                    { backgroundColor: colors.accent, flex: 1, opacity: pressed || updatingAvatar ? 0.75 : 1 },
                  ]}
                >
                  <Feather name="image" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    Choose Photo
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handlePickAvatar(true)}
                  disabled={updatingAvatar}
                  style={({ pressed }) => [
                    styles.photoActionBtn,
                    { backgroundColor: colors.accent, width: 48, opacity: pressed || updatingAvatar ? 0.75 : 1 },
                  ]}
                >
                  <Feather name="camera" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ── Inline Direct Edit Employee Modal ── */}
      <Modal visible={editModalOpen} animationType="fade" transparent onRequestClose={() => !savingEdit && setEditModalOpen(false)}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => !savingEdit && setEditModalOpen(false)} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "90%", maxWidth: 440 }}>
              <View style={[styles.modalContent, { backgroundColor: colors.isDark ? "#18181c" : "#ffffff", borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                      Edit Employee
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium" }}>
                      Update details without wizard steps
                    </Text>
                  </View>
                  <Pressable onPress={() => !savingEdit && setEditModalOpen(false)} hitSlop={10}>
                    <Feather name="x" size={20} color={colors.mutedForeground} />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                  {/* Section: Personal Information */}
                  <View style={styles.editSectionHeader}>
                    <Feather name="user" size={13} color={colors.primary} />
                    <Text style={[styles.editSectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                      Personal Information
                    </Text>
                  </View>
                  <ModalLabel text="Full Name *" />
                  <ModalInput value={editName} onChangeText={setEditName} placeholder="e.g. John Doe" />
                  <ModalLabel text="Professional Bio" />
                  <ModalInput
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder="Short bio or summary of responsibilities"
                    multiline
                  />

                  {/* Section: Role & Organization */}
                  <View style={[styles.editSectionHeader, { marginTop: 14 }]}>
                    <Feather name="briefcase" size={13} color={colors.primary} />
                    <Text style={[styles.editSectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                      Role & Organization
                    </Text>
                  </View>
                  <ModalLabel text="Role / Title" />
                  <ModalInput value={editRole} onChangeText={setEditRole} placeholder="e.g. HR Manager, Operations" />
                  <ModalLabel text="Department" />
                  <ModalInput value={editDepartment} onChangeText={setEditDepartment} placeholder="e.g. Human Resources" />
                  <ModalLabel text="Office / Branch" />
                  <ModalInput value={editOffice} onChangeText={setEditOffice} placeholder="e.g. Main Office" />
                  <ModalLabel text="Location" />
                  <ModalInput value={editLocation} onChangeText={setEditLocation} placeholder="e.g. Lagos, Nigeria" />

                  {/* Section: Contact Information */}
                  <View style={[styles.editSectionHeader, { marginTop: 14 }]}>
                    <Feather name="phone" size={13} color={colors.primary} />
                    <Text style={[styles.editSectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
                      Contact Information
                    </Text>
                  </View>
                  <ModalLabel text="Phone Number" />
                  <ModalInput value={editPhone} onChangeText={setEditPhone} placeholder="e.g. +234 801 234 5678" keyboardType="numeric" />
                  <ModalLabel text="Personal Email" />
                  <ModalInput value={editPersonalEmail} onChangeText={setEditPersonalEmail} placeholder="e.g. personal@gmail.com" />

                  <ModalBtn
                    label="Save Changes"
                    color={colors.primary}
                    loading={savingEdit}
                    onPress={handleSaveEdit}
                  />
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

/* ── Helper components ──────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10, paddingHorizontal: 4 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function SocialIconBtn({ icon, onPress }: { icon: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.socialIconBtn, { backgroundColor: colors.isDark ? "#222228" : "#f4f4f5", borderColor: colors.border, borderWidth: 1, opacity: pressed ? 0.7 : 1 }]}>
      <FontAwesome6 name={icon} size={18} color={colors.foreground} />
    </Pressable>
  );
}

function DetailRow({ icon, label, value, last, valueColor }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; last?: boolean; valueColor?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.detailRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={[styles.detailIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={14} color={colors.foreground} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: valueColor || colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, textTransform: "capitalize" }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ManageBtn({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.manageBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.manageIcon, { backgroundColor: colors.primary + "18" }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

function MoreRow({ icon, label, onPress, last }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.moreRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
        <Feather name={icon} size={16} color={colors.foreground} />
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 }}>{label}</Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

function EmptyLog({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={{ paddingVertical: 20, alignItems: "center" }}>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>{label}</Text>
    </View>
  );
}

function AdminModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "90%", maxWidth: 400 }}>
            <View style={[styles.modalContent, { backgroundColor: colors.isDark ? "#18181c" : "#ffffff", borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{title}</Text>
                <Pressable onPress={onClose} hitSlop={10}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </BlurView>
    </Modal>
  );
}

function ModalLabel({ text }: { text: string }) {
  const colors = useColors();
  return (
    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 12, marginBottom: 6 }}>
      {text}
    </Text>
  );
}

function ModalInput({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  const colors = useColors();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      keyboardType={keyboardType}
      style={[
        styles.modalInput,
        {
          color: colors.foreground,
          borderColor: colors.border,
          borderRadius: colors.radius,
          backgroundColor: colors.background,
          textAlignVertical: multiline ? "top" : "center",
          height: multiline ? 100 : 44,
        },
      ]}
    />
  );
}

function ModalPicker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 }}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.pickerPill,
              {
                backgroundColor: selected ? colors.accent : colors.muted,
                borderColor: selected ? colors.accent : colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Text
              style={{
                color: selected ? "#fff" : colors.foreground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 12,
              }}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ModalBtn({
  label,
  color,
  loading,
  onPress,
}: {
  label: string;
  color: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.modalBtn,
        {
          backgroundColor: color,
          borderRadius: colors.radius,
          opacity: (pressed || loading) ? 0.8 : 1,
          marginTop: 18,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  pageTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
    flex: 1,
  },

  /* ── Profile card ─────────────────────────────────── */
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  editText: {
    color: "#fff",
    fontSize: 13,
  },
  cardName: {
    color: "#fff",
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: 18,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  roleChipText: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 0.6,
  },
  cardBio: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 20,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  contactText: {
    color: "#fff",
    fontSize: 14,
  },

  /* ── Social ───────────────────────────────────────── */
  socialRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  socialIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Stats ────────────────────────────────────────── */
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: { fontSize: 13, letterSpacing: -0.2 },
  statLabel: { fontSize: 9, letterSpacing: 0.5 },

  /* ── Detail cards ─────────────────────────────────── */
  detailCard: { borderWidth: 1, paddingHorizontal: 14, overflow: "hidden" },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Manage ───────────────────────────────────────── */
  manageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  manageBtn: {
    width: "31%",
    paddingVertical: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  manageIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  moreCard: { borderWidth: 1, paddingHorizontal: 14, marginTop: 12 },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  financeLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    marginTop: 10,
  },

  /* ── Modal styling ────────────────────────────────── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderWidth: 1,
    padding: 20,
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  pickerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  modalBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  archiveIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  filePickerBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2563eb",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  photoModalCard: {
    width: "88%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  photoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  photoModalTitle: {
    fontSize: 18,
  },
  photoModalCloseBtn: {
    padding: 6,
  },
  photoPreviewWrapper: {
    width: 260,
    height: 260,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#000",
  },
  photoPreviewSquare: {
    width: "100%",
    height: "100%",
  },
  photoUpdatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
  },
  editSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    marginTop: 4,
  },
  editSectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
