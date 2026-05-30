import { FontAwesome6, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { apiService } from "@/services/api";

const STEPS = [
  { title: "Basic Info", subtitle: "Name, role & department" },
  { title: "Contact", subtitle: "Email, phone & location" },
  { title: "Profile", subtitle: "Bio, salary & performance" },
  { title: "Social Media", subtitle: "Add social handles" },
  { title: "Financial", subtitle: "Debts, shares & compensation" },
  { title: "Photo", subtitle: "Upload a profile photo (optional)" },
];

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
  "Other"
];
const STATUSES = [
  { id: "active", label: "Active", color: "#22c55e" },
  { id: "on_leave", label: "On Leave", color: "#f97316" },
];

export default function CreateEmployeeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { employees, refresh } = useData();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);

  const isEditing = !!editId;

  // Step 1 — Basic
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [office, setOffice] = useState("");
  const [status, setStatus] = useState("active");

  // Step 2 — Contact
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  // Step 3 — Profile
  const [bio, setBio] = useState("");
  const [salary, setSalary] = useState("");
  const [performance, setPerformance] = useState(3);

  // Step 4 — Social
  const [whatsapp, setWhatsapp] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phoneHandle, setPhoneHandle] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [discord, setDiscord] = useState("");
  const [twitter, setTwitter] = useState("");

  // Step 5 — Financial
  const [employeeOwes, setEmployeeOwes] = useState("");
  const [companyOwes, setCompanyOwes] = useState("");
  const [shares, setShares] = useState("");

  // Step 6 — Photo
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      const emp = employees.find((e) => String(e.id) === String(editId));
      if (emp) {
        setName(emp.name || "");
        setRole(emp.role || "");
        
        if (DEPARTMENTS.includes(emp.department || "")) {
          setDepartment(emp.department || "");
          setCustomDepartment("");
        } else if (emp.department) {
          setDepartment("Other");
          setCustomDepartment(emp.department);
        } else {
          setDepartment("");
          setCustomDepartment("");
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
          setEmployeeOwes(emp.finance.employee_owes_company ? emp.finance.employee_owes_company.toString() : "");
          setCompanyOwes(emp.finance.company_owes_employee ? emp.finance.company_owes_employee.toString() : "");
          setShares(emp.finance.shares ? emp.finance.shares.toString() : "");
        }

        setPhotoUri(emp.avatar || null);
      }
    }
  }, [editId, employees]);

  const canNext = () => {
    if (step === 0) {
      const depValid = department === "Other" ? customDepartment.trim().length > 0 : department.length > 0;
      return name.trim().length > 0 && role.trim().length > 0 && depValid;
    }
    if (step === 1) return email.includes("@");
    return true;
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

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

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    
    const formData = new FormData();
    formData.append("name", name);
    formData.append("role", role);
    const finalDepartment = department === "Other" ? customDepartment.trim() : department;
    formData.append("department", finalDepartment);
    formData.append("office", office);
    formData.append("status", status);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("location", location);
    formData.append("bio", bio);
    formData.append("salary", salary || "0");
    formData.append("performance", performance.toString());
    formData.append("initials", name.substring(0, 2).toUpperCase());
    
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

    if (photoUri && !photoUri.startsWith("http")) {
      const filename = photoUri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : `image`;
      
      formData.append("avatar", {
        uri: photoUri,
        name: filename,
        type,
      } as any);
    }

    // Since EmployeeFinance is a separate model, the backend serializer might need adjustment
    // but for now we'll pass the financial fields if the serializer supports them
    formData.append("finance_data", JSON.stringify({
      employee_owes_company: parseFloat(employeeOwes) || 0,
      company_owes_employee: parseFloat(companyOwes) || 0,
      shares: parseFloat(shares) || 0,
      current_pay: parseFloat(salary) || 0,
    }));

    try {
      if (isEditing) {
        await apiService.updateEmployee(editId!, formData);
      } else {
        await apiService.createEmployee(formData);
      }
      
      await refresh();
      
      showToast({
        title: isEditing ? "Employee Updated" : "Employee Created",
        message: `${name} has been ${isEditing ? "updated" : "added"} successfully.`,
        type: "success"
      });
      router.back();
    } catch (err) {
      console.error("Save failed:", err);
      Alert.alert("Error", "Failed to save employee data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={back} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {STEPS[step].title}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            Step {step + 1} of {STEPS.length}
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((step + 1) / STEPS.length) * 100}%`,
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
        {step === 0 && (
          <View style={{ gap: 16 }}>
            <Field label="Full Name" value={name} onChangeText={setName} placeholder="e.g. Amara Okonkwo" colors={colors} />
            <Field label="Role / Job Title" value={role} onChangeText={setRole} placeholder="e.g. Senior Engineer" colors={colors} />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Department</Text>
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
                  <Text style={{ color: department === d ? "#fff" : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
            {department === "Other" && (
              <Field label="Specify Department" value={customDepartment} onChangeText={setCustomDepartment} placeholder="e.g. Research & Development" colors={colors} />
            )}
            <Field label="Office" value={office} onChangeText={setOffice} placeholder="e.g. Lagos HQ" colors={colors} />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Status</Text>
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
                  <Text style={{ color: status === s.id ? s.color : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 16 }}>
            <Field label="Email Address" value={email} onChangeText={setEmail} placeholder="amara@company.com" colors={colors} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+234 803 555 0118" colors={colors} keyboardType="phone-pad" />
            <Field label="Location" value={location} onChangeText={setLocation} placeholder="Lagos, NG" colors={colors} />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 16 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Bio</Text>
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
            <Field label="Monthly Salary" value={salary} onChangeText={setSalary} placeholder="8500" colors={colors} keyboardType="numeric" />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Performance Rating</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable key={i} onPress={() => setPerformance(i)}>
                  <Feather name="star" size={28} color={i <= performance ? "#f59e0b" : colors.border} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 4 }}>
              Add social media handles. Only filled handles will appear on the profile.
            </Text>
            <SocialField icon="whatsapp" iconColor="#25D366" label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="+234..." colors={colors} />
            <SocialField icon="facebook" iconColor="#1877F2" label="Facebook" value={facebook} onChangeText={setFacebook} placeholder="username" colors={colors} />
            <SocialField icon="instagram" iconColor="#E4405F" label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="@handle" colors={colors} />
            <SocialField icon="phone" iconColor="#0ea5e9" label="Phone" value={phoneHandle} onChangeText={setPhoneHandle} placeholder="+234..." colors={colors} />
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Additional (optional)
            </Text>
            <SocialField icon="linkedin" iconColor="#0A66C2" label="LinkedIn" value={linkedin} onChangeText={setLinkedin} placeholder="profile URL" colors={colors} />
            <SocialField icon="discord" iconColor="#5865F2" label="Discord" value={discord} onChangeText={setDiscord} placeholder="username" colors={colors} />
            <SocialField icon="twitter" iconColor="#1DA1F2" label="X / Twitter" value={twitter} onChangeText={setTwitter} placeholder="@handle" colors={colors} />
          </View>
        )}

        {step === 4 && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 4 }}>
              Set financial details. Leave amounts as 0 if not applicable.
            </Text>
            <Field label="Employee owes company" value={employeeOwes} onChangeText={setEmployeeOwes} placeholder="0" colors={colors} keyboardType="numeric" />
            <Field label="Company owes employee" value={companyOwes} onChangeText={setCompanyOwes} placeholder="0" colors={colors} keyboardType="numeric" />
            <Field label="Company shares (%)" value={shares} onChangeText={setShares} placeholder="0" colors={colors} keyboardType="numeric" />
          </View>
        )}

        {step === 5 && (
          <View style={{ gap: 20, alignItems: "center", paddingTop: 20 }}>
            <Pressable
              onPress={pickImage}
              style={[
                styles.photoCircle,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
              ) : (
                <View style={{ alignItems: "center", gap: 8 }}>
                  <Feather name="camera" size={32} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                    Tap to upload
                  </Text>
                </View>
              )}
            </Pressable>
            {photoUri && (
              <Pressable onPress={() => setPhotoUri(null)}>
                <Text style={{ color: colors.danger, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Remove photo</Text>
              </Pressable>
            )}
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", paddingHorizontal: 20 }}>
              This step is optional. You can always add or change the photo later from the employee profile.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <PrimaryButton
          label={step === STEPS.length - 1 ? (isEditing ? "Save Changes" : "Save Employee") : "Continue"}
          onPress={next}
          disabled={!canNext()}
          icon={step === STEPS.length - 1 ? <Feather name="check" size={16} color="#fff" /> : <Feather name="arrow-right" size={16} color="#fff" />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChangeText, placeholder, colors, keyboardType, autoCapitalize }: any) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
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
    <View style={[styles.socialFieldRow, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
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
});
