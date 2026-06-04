import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
  { title: "Company Info", subtitle: "Name & contact person" },
  { title: "Contact Details", subtitle: "Email, location & website" },
  { title: "Description", subtitle: "What they do & remarks" },
  { title: "Financial details", subtitle: "Revenue, payments & debts" },
];

const STATUS_OPTIONS = [
  { id: "active", label: "Active", color: "#22c55e" },
  { id: "pending", label: "Pending", color: "#f97316" },
  { id: "completed", label: "Completed", color: "#2563eb" },
];

export default function CreateClientScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { clients, refresh } = useData();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);

  const isEditing = !!editId;

  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState("active");

  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  const [description, setDescription] = useState("");
  const [remark, setRemark] = useState("");

  // Financial States
  const [lifetimeValue, setLifetimeValue] = useState("");
  const [pendingPayments, setPendingPayments] = useState("");
  const [clientOwes, setClientOwes] = useState("");
  const [companyOwes, setCompanyOwes] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      const client = clients.find((c) => String(c.id) === String(editId));
      if (client) {
        setCompany(client.company || "");
        setContact(client.contact || "");
        setStatus(client.status || "active");
        setEmail(client.email || "");
        setLocation(client.location || "");
        setWebsite(client.website || "");
        setDescription(client.description || "");
        setRemark(client.remark || "");
        setLifetimeValue(client.lifetime_value ? client.lifetime_value.toString() : "");
        setPendingPayments(client.pending_payments ? client.pending_payments.toString() : "");
        setClientOwes(client.client_owes_company ? client.client_owes_company.toString() : "");
        setCompanyOwes(client.company_owes_client ? client.company_owes_client.toString() : "");
      }
    }
  }, [editId, clients]);

  const canNext = () => {
    if (step === 0) return company.trim().length > 0 && contact.trim().length > 0;
    if (step === 1) return email.includes("@");
    return true;
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleSave();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    const payload = {
      company,
      contact,
      status,
      email,
      location,
      website,
      description,
      remark,
      lifetime_value: parseFloat(lifetimeValue) || 0,
      pending_payments: parseFloat(pendingPayments) || 0,
      client_owes_company: parseFloat(clientOwes) || 0,
      company_owes_client: parseFloat(companyOwes) || 0,
      coords: { lat: 0, lng: 0 }, // Default coords
    };

    try {
      if (isEditing) {
        await apiService.updateClient(editId!, payload);
      } else {
        await apiService.createClient(payload);
      }
      await refresh();
      
      showToast({
        title: isEditing ? "Client Updated" : "Client Created",
        message: `${company} has been ${isEditing ? "updated" : "added"} successfully.`,
        type: "success",
      });
      router.back();
    } catch (err) {
      console.error("Save failed:", err);
      showToast({
        title: "Error",
        message: `Failed to ${isEditing ? "update" : "save"} client. Please try again.`,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
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

      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: colors.accent }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View style={{ gap: 16 }}>
            <Field label="Company Name" value={company} onChangeText={setCompany} placeholder="e.g. Northwind Retail" colors={colors} />
            <Field label="Contact Person" value={contact} onChangeText={setContact} placeholder="e.g. Sarah Lin" colors={colors} />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Status</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {STATUS_OPTIONS.map((s) => (
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
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="client@company.co" colors={colors} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Location" value={location} onChangeText={setLocation} placeholder="Lagos, NG" colors={colors} />
            <Field label="Website" value={website} onChangeText={setWebsite} placeholder="https://company.co" colors={colors} autoCapitalize="none" />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 16 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What does this client do?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              style={[styles.inputWrap, { borderColor: colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_500Medium", minHeight: 100, textAlignVertical: "top", paddingTop: 14 }]}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Internal Remark</Text>
            <TextInput
              value={remark}
              onChangeText={setRemark}
              placeholder="Notes for your team..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              style={[styles.inputWrap, { borderColor: colors.border, borderRadius: colors.radius, color: colors.foreground, fontFamily: "Inter_500Medium", minHeight: 80, textAlignVertical: "top", paddingTop: 14 }]}
            />
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 16 }}>
            <Field label="Lifetime Value (LTV)" value={lifetimeValue} onChangeText={setLifetimeValue} placeholder="e.g. 5000" colors={colors} keyboardType="numeric" />
            <Field label="Pending Payments" value={pendingPayments} onChangeText={setPendingPayments} placeholder="e.g. 1200" colors={colors} keyboardType="numeric" />
            <Field label="Client Owes Company" value={clientOwes} onChangeText={setClientOwes} placeholder="e.g. 800" colors={colors} keyboardType="numeric" />
            <Field label="Company Owes Client" value={companyOwes} onChangeText={setCompanyOwes} placeholder="e.g. 0" colors={colors} keyboardType="numeric" />
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <PrimaryButton
          label={step === STEPS.length - 1 ? (isEditing ? "Save Changes" : "Save Client") : "Continue"}
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

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 18, letterSpacing: -0.3 },
  progressBg: { height: 4, marginHorizontal: 20, borderRadius: 2, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 2 },
  fieldLabel: { fontSize: 12, marginBottom: 6, letterSpacing: 0.3, textTransform: "uppercase" },
  inputWrap: { paddingHorizontal: 14, height: 50, borderWidth: 1, justifyContent: "center" },
  input: { flex: 1, fontSize: 15 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
