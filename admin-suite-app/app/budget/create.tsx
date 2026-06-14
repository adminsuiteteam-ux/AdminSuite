import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

const TIMELINES = ["1W", "1M", "3M", "6M", "9M", "12M", "24M"];
const COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#0d9488",
];

export default function CreateBudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refresh } = useData();

  const [step, setStep] = useState(1);
  const [fields, setFields] = useState([{ id: "1", name: "", amount: "", color: COLORS[0] }]);
  const [duration, setDuration] = useState("1M");
  const [saving, setSaving] = useState(false);

  const addField = () => {
    const nextColor = COLORS[fields.length % COLORS.length];
    setFields([...fields, { id: Math.random().toString(), name: "", amount: "", color: nextColor }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, key: "name" | "amount", value: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const nextStep = () => {
    if (step === 1) {
      const valid = fields.every(f => f.name.trim() && f.amount.trim());
      if (!valid) {
        Alert.alert("Incomplete", "Please fill in all name and amount fields before continuing.");
        return;
      }
      setStep(2);
    } else {
      saveBudget();
    }
  };

  const saveBudget = async () => {
    setSaving(true);
    try {
      // Create a budget category for each field the user defined
      const promises = fields.map(f =>
        apiService.createBudget({
          name: f.name.trim(),
          allocated: parseFloat(f.amount) || 0,
          spent: 0,
          color: f.color,
        })
      );
      await Promise.all(promises);
      await refresh();
      router.back();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        "Failed to save budget. Please try again.";
      Alert.alert("Save Failed", msg);
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
          onPress={() => step === 2 ? setStep(1) : router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Create Budget
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress indicator */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, { backgroundColor: colors.primary }]} />
        <View style={[styles.progressLine, { backgroundColor: step === 2 ? colors.primary : colors.border }]} />
        <View style={[styles.progressDot, {
          backgroundColor: step === 2 ? colors.primary : colors.card,
          borderColor: step === 2 ? colors.primary : colors.border,
          borderWidth: step === 2 ? 0 : 2,
        }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {step === 1 ? (
          <View style={styles.slide}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Define Purposes
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Create fields for your budget, name them, and set the allocated amount.
            </Text>

            {fields.map((f, index) => (
              <View key={f.id} style={styles.fieldRow}>
                {/* Color dot */}
                <View style={[styles.colorDot, { backgroundColor: f.color }]} />
                <View style={{ flex: 2 }}>
                  <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Name</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                    placeholder="e.g. Software"
                    placeholderTextColor={colors.mutedForeground}
                    value={f.name}
                    onChangeText={(val) => updateField(f.id, "name", val)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Amount</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    value={f.amount}
                    onChangeText={(val) => updateField(f.id, "amount", val)}
                  />
                </View>
                {fields.length > 1 && (
                  <Pressable onPress={() => removeField(f.id)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={20} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            ))}

            <Pressable onPress={addField} style={[styles.addBtn, { borderColor: colors.border }]}>
              <Feather name="plus" size={16} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Add Field</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.slide}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Set Duration
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Choose the timeline for this budget plan.
            </Text>

            {/* Summary of what will be saved */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5, marginBottom: 10 }}>
                BUDGET SUMMARY
              </Text>
              {fields.map(f => (
                <View key={f.id} style={styles.summaryRow}>
                  <View style={[styles.colorDot, { backgroundColor: f.color }]} />
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", flex: 1, fontSize: 14 }}>{f.name}</Text>
                  <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 14 }}>${parseFloat(f.amount || "0").toFixed(2)}</Text>
                </View>
              ))}
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", flex: 1, fontSize: 13 }}>Total</Text>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                  ${fields.reduce((s, f) => s + (parseFloat(f.amount || "0") || 0), 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.durationGrid}>
              {TIMELINES.map(t => {
                const active = duration === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setDuration(t)}
                    style={[
                      styles.durationCard,
                      {
                        backgroundColor: active ? colors.primary + "1A" : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={{ color: active ? colors.primary : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <Pressable
          onPress={nextStep}
          disabled={saving}
          style={[styles.nextBtn, { backgroundColor: saving ? colors.muted : colors.primary }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                {step === 1 ? "Next: Duration" : "Save Budget"}
              </Text>
              <Feather name={step === 1 ? "arrow-right" : "check"} size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 18 },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  progressDot: { width: 12, height: 12, borderRadius: 6 },
  progressLine: { width: 40, height: 2, borderRadius: 1 },
  slide: { flex: 1 },
  slideTitle: { fontSize: 24, letterSpacing: -0.5, marginBottom: 8 },
  slideSub: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  fieldRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 16 },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 14 },
  label: { fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_500Medium" },
  deleteBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", marginTop: 8 },
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 20 },
  durationCard: { width: "30%", height: 64, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 16 },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20, gap: 8 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryDivider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  footer: { padding: 16, borderTopWidth: 1 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 16 },
});
