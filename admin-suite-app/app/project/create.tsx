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

import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";

export default function CreateProjectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { projects, clients, refresh } = useData();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const isEditing = !!editId;

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("active");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const statuses = ["active", "planned", "on_hold", "completed"];

  useEffect(() => {
    if (editId) {
      const project = projects.find((p) => String(p.id) === String(editId));
      if (project) {
        setName(project.name || "");
        setClientId(project.client ? String(project.client) : "");
        setStatus(project.status || "active");
        setValue(project.value ? String(project.value) : "");
      }
    }
  }, [editId, projects]);

  const handleSave = async () => {
    if (saving) return;

    if (!name.trim()) {
      Alert.alert("Validation Error", "Please enter a project name.");
      return;
    }
    if (!clientId) {
      Alert.alert("Validation Error", "Please select a client. If you have no clients, you must create a client first.");
      return;
    }
    if (!value.trim()) {
      Alert.alert("Validation Error", "Please enter a project value.");
      return;
    }
    if (isNaN(parseFloat(value))) {
      Alert.alert("Validation Error", "Please enter a valid numeric project value.");
      return;
    }
    
    setSaving(true);
    const existingProj = projects.find((p) => String(p.id) === String(editId));
    try {
      await (isEditing
        ? apiService.updateProject(editId!, {
            name: name.trim(),
            client: parseInt(clientId),
            status,
            value: parseFloat(value) || 0,
            progress: status === "completed" ? 100 : (existingProj?.progress || 0),
          })
        : apiService.createProject({
            name: name.trim(),
            client: parseInt(clientId),
            status,
            value: parseFloat(value) || 0,
            progress: status === "completed" ? 100 : 0,
          }));
      await refresh();
      router.back();
    } catch (err: any) {
      console.error("Save failed:", err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      Alert.alert("Save Error", `Failed to save project: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {isEditing ? "Edit Project" : "New Project"}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Project Name</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="E.g. Website Redesign"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Client</Text>
          {clients.length === 0 ? (
            <View style={[styles.emptyClientsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.danger, fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 12 }}>
                No clients found in your workspace. You must create at least one client before adding a project.
              </Text>
              <Pressable
                onPress={() => router.push("/client/create")}
                style={({ pressed }) => [
                  styles.createClientBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.9 : 1,
                  }
                ]}
              >
                <Feather name="plus" size={14} color={colors.primaryForeground} />
                <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  Create Client
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.clientGrid}>
              {clients.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setClientId(String(c.id))}
                  style={[
                    styles.clientChip,
                    {
                      backgroundColor: clientId === String(c.id) ? colors.primary : colors.card,
                      borderColor: clientId === String(c.id) ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: clientId === String(c.id) ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                    {c.company}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Status</Text>
          <View style={styles.chipGrid}>
            {statuses.map((s) => (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: status === s ? colors.primary : colors.card,
                    borderColor: status === s ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: status === s ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "capitalize" }}>
                  {s.replace("_", " ")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Value</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            value={value}
            onChangeText={setValue}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <Pressable onPress={handleSave} disabled={saving} style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}>
          <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
            {saving ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Project")}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 18 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_500Medium" },
  clientGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  clientChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  footer: { padding: 16, borderTopWidth: 1 },
  submitBtn: { height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyClientsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  createClientBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
