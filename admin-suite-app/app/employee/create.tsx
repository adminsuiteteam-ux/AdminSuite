import { FontAwesome6, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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

import { PrimaryButton } from "@/components/PrimaryButton";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";
import { apiService, appendFileToFormData, getMediaUrl } from "@/services/api";

// ─────────────────────────────────────────────────────────────
// Step definitions differ by role
// ─────────────────────────────────────────────────────────────
const getStepsList = (selectedRole: string) => {
  if (selectedRole === "Admin") {
    return [
      { title: "Select Role", subtitle: "Choose account type" },
      { title: "Admin Setup", subtitle: "Branch & basic details" },
    ];
  }
  return [
    { title: "Select Role", subtitle: "Choose account type" },
    { title: "Basic Info", subtitle: "Name & department" },
    { title: "Contact", subtitle: "Email, phone & location" },
    { title: "Profile", subtitle: "Bio, salary & performance" },
    { title: "Social Media", subtitle: "Add social handles" },
    { title: "Financial", subtitle: "Debts, shares & compensation" },
    { title: "Photo", subtitle: "Upload a profile photo (optional)" },
  ];
};

const DEPARTMENTS = [
  "Human Resources",
  "Finance",
  "Customer Service",
  "Legal",
  "Marketing",
  "Sales",
  "Operations",
  "Product Development",
  "Procurement",
  "IT Support",
  "Other",
];

const STATUSES = [
  { id: "active", label: "Active", color: "#22c55e" },
  { id: "on_leave", label: "On Leave", color: "#f97316" },
];

const AVAILABLE_ROLES = [
  {
    id: "Admin",
    label: "New Admin",
    desc: "Full executive dashboard access (CEO / Branch Admin)",
    icon: "crown",
    color: "#f59e0b",
  },
  {
    id: "HR Manager",
    label: "HR Manager",
    desc: "Manages hiring, employee welfare, KPIs, relations",
    icon: "users",
    color: "#6366f1",
  },
  {
    id: "Secretary",
    label: "Secretary",
    desc: "Manages calendars, company docs, schedules meetings",
    icon: "calendar",
    color: "#0ea5e9",
  },
  {
    id: "Finance Officer",
    label: "Finance Officer",
    desc: "Oversees revenue, spending, reserve funds, budgets",
    icon: "chart-line",
    color: "#10b981",
  },
  {
    id: "Operations Manager",
    label: "Operations Manager",
    desc: "Coordinates projects, tasks, workflows, milestones",
    icon: "gears",
    color: "#ef4444",
  },
  {
    id: "Department Manager",
    label: "Department Manager",
    desc: "Supervises specific department teams and metrics",
    icon: "building",
    color: "#8b5cf6",
  },
  {
    id: "Employee",
    label: "Employee",
    desc: "Execution member, task completions, collaboration",
    icon: "user-tie",
    color: "#64748b",
  },
];

// Map UI role label → backend role key
const ROLE_KEY_MAP: Record<string, string> = {
  Admin: "BRANCH_ADMIN",
  "HR Manager": "HR",
  Secretary: "SECRETARY",
  "Finance Officer": "FINANCE",
  "Operations Manager": "OPERATIONS",
  "Department Manager": "DEPT_MANAGER",
  Employee: "EMPLOYEE",
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function CreateEmployeeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { employees, refresh } = useData();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);

  const isEditing = !!editId;

  // ── Step 0: Role selector state ──────────────────────────────
  const [selectedRole, setSelectedRole] = useState<string>("");

  // ── Step 1 (Admin): Branch scope ────────────────────────────
  const [adminScope, setAdminScope] = useState<"current" | "new_branch">("current");
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");

  // ── Step 1 (Non-Admin): Basic info ─────────────────────────
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [office, setOffice] = useState("");
  const [status, setStatus] = useState("active");

  // ── Step 2: Contact ─────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  // ── Step 3: Profile ─────────────────────────────────────────
  const [bio, setBio] = useState("");
  const [salary, setSalary] = useState("");
  const [performance, setPerformance] = useState(3);

  // ── Step 4: Social ──────────────────────────────────────────
  const [whatsapp, setWhatsapp] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phoneHandle, setPhoneHandle] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [discord, setDiscord] = useState("");
  const [twitter, setTwitter] = useState("");

  // ── Step 5: Financial ───────────────────────────────────────
  const [employeeOwes, setEmployeeOwes] = useState("");
  const [companyOwes, setCompanyOwes] = useState("");
  const [shares, setShares] = useState("");

  // ── Step 6: Photo ───────────────────────────────────────────
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Success modal ───────────────────────────────────────────
  const [createdEmployee, setCreatedEmployee] = useState<{
    email: string;
    tempPassword?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Derived steps list ──────────────────────────────────────
  const stepsList = getStepsList(selectedRole);

  // ── Pre-fill when editing ───────────────────────────────────
  useEffect(() => {
    if (editId) {
      const emp = employees.find((e) => String(e.id) === String(editId));
      if (emp) {
        setName(emp.name || "");
        setRole(emp.role || "");

        const rUpper = (emp.role || "").toUpperCase();
        if (rUpper.includes("CEO") || rUpper.includes("ADMIN") || rUpper.includes("BRANCH")) {
          setSelectedRole("Admin");
        } else if (rUpper.includes("HR")) {
          setSelectedRole("HR Manager");
        } else if (rUpper.includes("FINANCE")) {
          setSelectedRole("Finance Officer");
        } else if (rUpper.includes("OPERATIONS")) {
          setSelectedRole("Operations Manager");
        } else if (rUpper.includes("SECRETARY")) {
          setSelectedRole("Secretary");
        } else if (rUpper.includes("DEPT") || rUpper.includes("DEPARTMENT")) {
          setSelectedRole("Department Manager");
        } else {
          setSelectedRole("Employee");
        }

        if (DEPARTMENTS.includes(emp.department || "")) {
          setDepartment(emp.department || "");
          setCustomDepartment("");
        } else if (emp.department) {
          setDepartment("Other");
          setCustomDepartment(emp.department);
        }

        setOffice(emp.office || "");
        setStatus(emp.status || "active");
        setEmail(emp.email || "");
        setPhone(emp.phone || "");
        setLocation(emp.location || "");
        setBio(emp.bio || "");
        setSalary(emp.salary ? emp.salary.toString() : "");
        setPerformance(emp.performance || 3);

        if (emp.socials) {
          setWhatsapp(emp.socials.whatsapp || "");
          setFacebook(emp.socials.facebook || "");
          setInstagram(emp.socials.instagram || "");
          setPhoneHandle(emp.socials.phone || "");
          setLinkedin(emp.socials.linkedin || "");
          setDiscord(emp.socials.discord || "");
          setTwitter(emp.socials.twitter || "");
        }

        if (emp.finance) {
          setEmployeeOwes(
            emp.finance.employee_owes_company
              ? emp.finance.employee_owes_company.toString()
              : ""
          );
          setCompanyOwes(
            emp.finance.company_owes_employee
              ? emp.finance.company_owes_employee.toString()
              : ""
          );
          setShares(emp.finance.shares ? emp.finance.shares.toString() : "");
        }

        setPhotoUri(emp.avatar ? getMediaUrl(emp.avatar) : null);
        // skip to step 1 when editing (skip role selector)
        setStep(1);
      }
    }
  }, [editId, employees]);

  // ── Validation ──────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) return selectedRole !== "";

    if (selectedRole === "Admin") {
      // Step 1 for Admin: name, email, and branch if new
      const branchOk =
        adminScope === "current" ||
        (branchName.trim().length > 0 && branchLocation.trim().length > 0);
      return name.trim().length > 0 && email.includes("@") && phone.trim().length > 0 && branchOk;
    }

    // Non-admin steps
    if (step === 1) {
      const depValid =
        department === "Other" ? customDepartment.trim().length > 0 : department.length > 0;
      // office is optional (blank=True on the model) — don't gate on it
      return name.trim().length > 0 && depValid;
    }
    if (step === 2) return email.includes("@") && phone.trim().length > 0;
    return true;
  };

  const next = () => {
    if (!canNext()) {
      // Show a specific hint about what's missing
      if (step === 0) {
        Alert.alert("Select a Role", "Please select a role before continuing.");
      } else if (step === 1 && selectedRole !== "Admin") {
        if (!name.trim()) {
          Alert.alert("Name Required", "Please enter the employee's full name.");
        } else {
          Alert.alert("Department Required", "Please select a department to continue.");
        }
      } else if (step === 1 && selectedRole === "Admin") {
        if (!name.trim()) Alert.alert("Name Required", "Please enter the admin's full name.");
        else if (!email.includes("@")) Alert.alert("Email Required", "Please enter a valid email address.");
        else if (!phone.trim()) Alert.alert("Phone Required", "Please enter a phone number.");
        else Alert.alert("Branch Details", "Please fill in the branch name and location.");
      } else if (step === 2) {
        if (!email.includes("@")) Alert.alert("Email Required", "Please enter a valid email address.");
        else Alert.alert("Phone Required", "Please enter a phone number.");
      }
      return;
    }
    if (step < stepsList.length - 1) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  // ── Image picker ────────────────────────────────────────────
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // ── Copy temp password ───────────────────────────────────────
  const handleCopyPassword = async () => {
    if (!createdEmployee?.tempPassword) return;
    const success = await copyToClipboard(createdEmployee.tempPassword);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Save / Submit ───────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("initials", name.substring(0, 2).toUpperCase());

    if (selectedRole === "Admin") {
      formData.append("role", ROLE_KEY_MAP["Admin"]);
      formData.append("department", "Administration");
      formData.append("status", "active");

      if (adminScope === "new_branch") {
        formData.append("office", branchName);
        formData.append("branch_name", branchName);
        formData.append("branch_location", branchLocation);
        formData.append("location", branchLocation);
      } else {
        formData.append("office", "Main Office");
        formData.append("location", location || "Main Headquarters");
      }
    } else {
      formData.append("role", ROLE_KEY_MAP[selectedRole] || selectedRole);
      const finalDepartment =
        department === "Other" ? customDepartment.trim() : department;
      formData.append("department", finalDepartment);
      formData.append("office", office);
      formData.append("status", status);
      formData.append("location", location);
      formData.append("bio", bio);
      formData.append("salary", salary || "0");
      formData.append("performance", performance.toString());

      const socials = {
        whatsapp,
        facebook,
        instagram,
        phone: phoneHandle,
        linkedin,
        discord,
        twitter,
      };
      formData.append("socials", JSON.stringify(socials));

      await appendFileToFormData(formData, "avatar", photoUri);

      formData.append(
        "finance_data",
        JSON.stringify({
          employee_owes_company: parseFloat(employeeOwes) || 0,
          company_owes_employee: parseFloat(companyOwes) || 0,
          shares: parseFloat(shares) || 0,
          current_pay: parseFloat(salary) || 0,
        })
      );
    }

    try {
      let response;
      if (isEditing) {
        response = await apiService.updateEmployee(editId!, formData);
        await refresh();
        showToast({
          title: "Employee Updated",
          message: `${name} has been updated successfully.`,
          type: "success",
        });
        router.back();
      } else {
        response = await apiService.createEmployee(formData);
        await refresh();
        const tempPassword = response.data?.temp_password;
        if (tempPassword) {
          setCreatedEmployee({ email, tempPassword });
        } else {
          showToast({
            title: "Account Created",
            message: `${name}'s account has been set up. A login email has been sent.`,
            type: "success",
          });
          router.back();
        }
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      // Extract the most useful error message from the server response
      const data = err?.response?.data;
      let msg = "Failed to save employee data. Please try again.";
      if (data) {
        if (typeof data === "string") {
          msg = data;
        } else if (data.detail) {
          msg = data.detail;
        } else if (data.email) {
          msg = Array.isArray(data.email) ? data.email[0] : data.email;
        } else if (data.non_field_errors) {
          msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        } else {
          // Grab first field error
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = data[firstKey];
            msg = `${firstKey}: ${Array.isArray(val) ? val[0] : val}`;
          }
        }
      }
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const currentStep = stepsList[step] ?? { title: "Creating", subtitle: "" };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={back}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
          >
            {isEditing ? "Edit Employee" : currentStep.title}
          </Text>
          <Text
            style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}
          >
            {isEditing ? currentStep.subtitle : `Step ${step + 1} of ${stepsList.length}`}
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Progress bar ────────────────────────────────────── */}
      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((step + 1) / stepsList.length) * 100}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══════════════════════════════════════════════════
            STEP 0 — ROLE SELECTOR
        ══════════════════════════════════════════════════ */}
        {step === 0 && (
          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 20,
                marginBottom: 4,
              }}
            >
              Who are you creating this account for?
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Select the role that best matches the new team member's responsibilities.
            </Text>
            {AVAILABLE_ROLES.map((r) => {
              const isSelected = selectedRole === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setSelectedRole(r.id)}
                  style={[
                    styles.roleCard,
                    {
                      backgroundColor: isSelected ? r.color + "15" : colors.card,
                      borderColor: isSelected ? r.color : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.roleIconWrap,
                      { backgroundColor: r.color + (isSelected ? "25" : "15") },
                    ]}
                  >
                    <FontAwesome6 name={r.icon as any} size={18} color={r.color} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        color: isSelected ? r.color : colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 15,
                      }}
                    >
                      {r.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        lineHeight: 17,
                      }}
                    >
                      {r.desc}
                    </Text>
                  </View>
                  {isSelected && (
                    <View
                      style={[styles.roleCheckCircle, { backgroundColor: r.color }]}
                    >
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 1 (ADMIN) — BRANCH SCOPE + DETAILS
        ══════════════════════════════════════════════════ */}
        {step === 1 && selectedRole === "Admin" && (
          <View style={{ gap: 16 }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 18,
                marginBottom: 4,
              }}
            >
              Admin Account Setup
            </Text>

            {/* Branch scope selector */}
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              Branch Scope
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { id: "current" as const, label: "Current Company", icon: "building-2" },
                { id: "new_branch" as const, label: "New Branch", icon: "git-branch" },
              ].map((s) => {
                const isSel = adminScope === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setAdminScope(s.id)}
                    style={[
                      styles.scopeCard,
                      {
                        flex: 1,
                        backgroundColor: isSel ? colors.accent + "18" : colors.card,
                        borderColor: isSel ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Feather
                      name={s.icon as any}
                      size={18}
                      color={isSel ? colors.accent : colors.mutedForeground}
                    />
                    <Text
                      style={{
                        color: isSel ? colors.accent : colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 13,
                        textAlign: "center",
                        marginTop: 4,
                      }}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* New branch fields */}
            {adminScope === "new_branch" && (
              <>
                <View
                  style={[
                    styles.infoBanner,
                    { backgroundColor: colors.accent + "12", borderColor: colors.accent + "40" },
                  ]}
                >
                  <Feather name="info" size={14} color={colors.accent} />
                  <Text
                    style={{
                      color: colors.accent,
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      flex: 1,
                      lineHeight: 19,
                    }}
                  >
                    A new branch will be created and this admin will be its branch head.
                  </Text>
                </View>
                <Field
                  label="Branch Name"
                  value={branchName}
                  onChangeText={setBranchName}
                  placeholder="e.g. Abuja Branch"
                  colors={colors}
                />
                <Field
                  label="Branch Location"
                  value={branchLocation}
                  onChangeText={setBranchLocation}
                  placeholder="e.g. Abuja, Nigeria"
                  colors={colors}
                />
              </>
            )}

            {/* Common admin fields */}
            <View style={[styles.dividerLine, { backgroundColor: colors.border, marginVertical: 4 }]} />
            <Field
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chukwuemeka Obi"
              colors={colors}
            />
            <Field
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="admin@company.com"
              colors={colors}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+234 803 555 0118"
              colors={colors}
              keyboardType="phone-pad"
            />
          </View>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 1 (STANDARD) — BASIC INFO
        ══════════════════════════════════════════════════ */}
        {step === 1 && selectedRole !== "Admin" && (
          <View style={{ gap: 16 }}>
            <Field
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Amara Okonkwo"
              colors={colors}
            />
            <Field
              label="Role / Job Title"
              value={role}
              onChangeText={setRole}
              placeholder="e.g. Senior Engineer"
              colors={colors}
            />
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              Department
            </Text>
            <View style={styles.chipGrid}>
              {DEPARTMENTS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDepartment(d)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: department === d ? colors.accent : colors.card,
                      borderColor: department === d ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: department === d ? "#fff" : colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
            {department === "Other" && (
              <Field
                label="Specify Department"
                value={customDepartment}
                onChangeText={setCustomDepartment}
                placeholder="e.g. Research & Development"
                colors={colors}
              />
            )}
            <Field
              label="Office"
              value={office}
              onChangeText={setOffice}
              placeholder="e.g. Lagos HQ"
              colors={colors}
            />
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              Status
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {STATUSES.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setStatus(s.id)}
                  style={[
                    styles.chip,
                    {
                      flex: 1,
                      backgroundColor: status === s.id ? s.color + "1A" : colors.card,
                      borderColor: status === s.id ? s.color : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                  <Text
                    style={{
                      color: status === s.id ? s.color : colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 2 (STANDARD) — CONTACT
        ══════════════════════════════════════════════════ */}
        {step === 2 && selectedRole !== "Admin" && (
          <View style={{ gap: 16 }}>
            <Field
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="amara@company.com"
              colors={colors}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+234 803 555 0118"
              colors={colors}
              keyboardType="phone-pad"
            />
            <Field
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="Lagos, NG"
              colors={colors}
            />
          </View>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 3 (STANDARD) — PROFILE
        ══════════════════════════════════════════════════ */}
        {step === 3 && selectedRole !== "Admin" && (
          <View style={{ gap: 16 }}>
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              Bio
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="A short description about this employee..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              style={[
                styles.inputWrap,
                {
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  color: colors.foreground,
                  fontFamily: "Inter_500Medium",
                  minHeight: 100,
                  textAlignVertical: "top",
                  paddingTop: 14,
                },
              ]}
            />
            <Field
              label="Monthly Salary"
              value={salary}
              onChangeText={setSalary}
              placeholder="8500"
              colors={colors}
              keyboardType="numeric"
            />
            <Text
              style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              Performance Rating
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => setPerformance(i)}>
                  <Feather
                    name="star"
                    size={28}
                    color={i <= performance ? "#f59e0b" : colors.border}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 4 (STANDARD) — SOCIAL
        ══════════════════════════════════════════════════ */}
        {step === 4 && selectedRole !== "Admin" && (
          <View style={{ gap: 16 }}>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              Add social media handles. Only filled handles will appear on the profile.
            </Text>
            <SocialField
              icon="whatsapp"
              iconColor="#25D366"
              label="WhatsApp"
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="+234..."
              colors={colors}
            />
            <SocialField
              icon="facebook"
              iconColor="#1877F2"
              label="Facebook"
              value={facebook}
              onChangeText={setFacebook}
              placeholder="username"
              colors={colors}
            />
            <SocialField
              icon="instagram"
              iconColor="#E4405F"
              label="Instagram"
              value={instagram}
              onChangeText={setInstagram}
              placeholder="@handle"
              colors={colors}
            />
            <SocialField
              icon="phone"
              iconColor="#0ea5e9"
              label="Phone"
              value={phoneHandle}
              onChangeText={setPhoneHandle}
              placeholder="+234..."
              colors={colors}
            />
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Additional (optional)
            </Text>
            <SocialField
              icon="linkedin"
              iconColor="#0A66C2"
              label="LinkedIn"
              value={linkedin}
              onChangeText={setLinkedin}
              placeholder="profile URL"
              colors={colors}
            />
            <SocialField
              icon="discord"
              iconColor="#5865F2"
              label="Discord"
              value={discord}
              onChangeText={setDiscord}
              placeholder="username"
              colors={colors}
            />
            <SocialField
              icon="twitter"
              iconColor="#1DA1F2"
              label="X / Twitter"
              value={twitter}
              onChangeText={setTwitter}
              placeholder="@handle"
              colors={colors}
            />
          </View>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 5 (STANDARD) — FINANCIAL
        ══════════════════════════════════════════════════ */}
        {step === 5 && selectedRole !== "Admin" && (
          <View style={{ gap: 16 }}>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              Set financial details. Leave amounts as 0 if not applicable.
            </Text>
            <Field
              label="Employee owes company"
              value={employeeOwes}
              onChangeText={setEmployeeOwes}
              placeholder="0"
              colors={colors}
              keyboardType="numeric"
            />
            <Field
              label="Company owes employee"
              value={companyOwes}
              onChangeText={setCompanyOwes}
              placeholder="0"
              colors={colors}
              keyboardType="numeric"
            />
            <Field
              label="Company shares (%)"
              value={shares}
              onChangeText={setShares}
              placeholder="0"
              colors={colors}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 6 (STANDARD) — PHOTO
        ══════════════════════════════════════════════════ */}
        {step === 6 && selectedRole !== "Admin" && (
          <View style={{ gap: 20, alignItems: "center", paddingTop: 20 }}>
            <Pressable
              onPress={pickImage}
              style={[
                styles.photoCircle,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              {photoUri ? (
                <Image source={{ uri: getMediaUrl(photoUri) }} style={styles.photoImage} />
              ) : (
                <View style={{ alignItems: "center", gap: 8 }}>
                  <Feather name="camera" size={32} color={colors.mutedForeground} />
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                      fontSize: 12,
                    }}
                  >
                    Tap to upload
                  </Text>
                </View>
              )}
            </Pressable>
            {photoUri && (
              <Pressable onPress={() => setPhotoUri(null)}>
                <Text
                  style={{
                    color: colors.danger,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 13,
                  }}
                >
                  Remove photo
                </Text>
              </Pressable>
            )}
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                textAlign: "center",
                paddingHorizontal: 20,
              }}
            >
              This step is optional. You can always add or change the photo later from the employee
              profile.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Footer ─────────────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <PrimaryButton
          label={
            step === stepsList.length - 1
              ? isEditing
                ? "Save Changes"
                : "Create Account"
              : "Continue"
          }
          onPress={next}
          disabled={!canNext() || saving}
          icon={
            step === stepsList.length - 1 ? (
              <Feather name="check" size={16} color="#fff" />
            ) : (
              <Feather name="arrow-right" size={16} color="#fff" />
            )
          }
        />
      </View>

      {/* ── Success Modal ───────────────────────────────────── */}
      <Modal visible={createdEmployee !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.successIconCircle, { backgroundColor: colors.accent + "1A" }]}>
              <Feather name="check-circle" size={40} color={colors.accent} />
            </View>
            <Text
              style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
            >
              Account Created! 🎉
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              A welcome email with login details has been sent to the employee. You can also share
              the temporary password below:
            </Text>

            <View
              style={[
                styles.detailsContainer,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>EMAIL</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]} selectable>
                  {createdEmployee?.email}
                </Text>
              </View>
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                  TEMPORARY PASSWORD
                </Text>
                <View style={styles.passwordCopyRow}>
                  <Text
                    style={[styles.detailValue, styles.passwordValue, { color: colors.foreground }]}
                    selectable
                  >
                    {createdEmployee?.tempPassword}
                  </Text>
                  <Pressable
                    onPress={handleCopyPassword}
                    style={({ pressed }) => [
                      styles.copyBtn,
                      {
                        backgroundColor: copied ? colors.accent + "1A" : colors.border + "4D",
                        borderColor: copied ? colors.accent : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Feather
                      name={copied ? "check" : "copy"}
                      size={14}
                      color={copied ? colors.accent : colors.foreground}
                    />
                    <Text style={[styles.copyBtnText, { color: copied ? colors.accent : colors.foreground }]}>
                      {copied ? "Copied" : "Copy"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={[styles.infoNote, { color: colors.mutedForeground }]}>
              The employee will be required to change this password on their first login.
            </Text>

            <Pressable
              onPress={() => {
                setCreatedEmployee(null);
                router.back();
              }}
              style={({ pressed }) => [
                styles.modalDoneBtn,
                { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, colors, keyboardType, autoCapitalize }: any) {
  return (
    <View>
      <Text
        style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
      >
        {label}
      </Text>
      <View style={[styles.inputWrap, { borderColor: colors.border, borderRadius: colors.radius }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
        />
      </View>
    </View>
  );
}

function SocialField({ icon, iconColor, label, value, onChangeText, placeholder, colors }: any) {
  return (
    <View
      style={[
        styles.socialFieldRow,
        {
          borderColor: colors.border,
          borderRadius: colors.radius,
          backgroundColor: colors.card,
        },
      ]}
    >
      <View style={[styles.socialIconWrap, { backgroundColor: iconColor + "1A" }]}>
        <FontAwesome6 name={icon} size={16} color={iconColor} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={`${label} — ${placeholder}`}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.socialInput, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Clipboard helper
// ─────────────────────────────────────────────────────────────
const copyToClipboard = async (text: string) => {
  if (Platform.OS === "web") {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } else {
    try {
      const { Clipboard } = require("react-native");
      Clipboard.setString(text);
      return true;
    } catch (e) {
      console.warn("Clipboard copy failed", e);
    }
  }
  return false;
};

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, letterSpacing: -0.3 },
  progressBg: {
    height: 4,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 2 },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputWrap: {
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    justifyContent: "center",
  },
  input: { flex: 1, fontSize: 15 },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  roleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 4,
  },
  infoBanner: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  socialFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
  },
  socialIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  socialInput: { flex: 1, fontSize: 14 },
  dividerLine: { height: 1, marginVertical: 4 },
  photoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImage: { width: 160, height: 160, borderRadius: 80 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, marginBottom: 8, textAlign: "center" },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  detailsContainer: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  detailRow: { gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontWeight: "500" },
  detailDivider: { height: 1, width: "100%" },
  passwordCopyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  passwordValue: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyBtnText: { fontSize: 12, fontWeight: "600" },
  infoNote: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  modalDoneBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalDoneBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
