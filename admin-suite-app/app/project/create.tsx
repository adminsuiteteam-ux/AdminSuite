import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
  const { clients, refresh } = useData();

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("active");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const statuses = ["active", "planned", "on_hold", "completed"];

  const handleSave = async () => {
    if (saving) return;
    if (!name || !clientId || !value) return;
    
    setSaving(true);
    try {
      await apiService.createProject({
        name,
        client: parseInt(clientId),
        status,
        value: parseFloat(value) || 0,
        progress: status === "completed" ? 100 : 0,
      });
      await refresh();
      router.back();
    } catch (err) {
      console.error("Save failed:", err);
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
          New Project
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
            {saving ? "Creating..." : "Create Project"}
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
});
