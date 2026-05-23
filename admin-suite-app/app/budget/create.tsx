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

import { useColors } from "@/hooks/useColors";

const TIMELINES = ["1W", "1M", "3M", "6M", "9M", "12M", "24M"];

export default function CreateBudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState([{ id: "1", name: "", amount: "" }]);
  const [duration, setDuration] = useState("1M");

  const addField = () => {
    setFields([...fields, { id: Math.random().toString(), name: "", amount: "" }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, key: "name" | "amount", value: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const nextStep = () => {
    if (step === 1) setStep(2);
    else {
      // Save budget and return
      router.back();
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

      <View style={styles.progressRow}>
        <View style={[styles.progressDot, { backgroundColor: colors.primary }]} />
        <View style={[styles.progressLine, { backgroundColor: step === 2 ? colors.primary : colors.border }]} />
        <View style={[styles.progressDot, { backgroundColor: step === 2 ? colors.primary : colors.card, borderColor: step === 2 ? colors.primary : colors.border, borderWidth: step === 2 ? 0 : 2 }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {step === 1 ? (
          <View style={styles.slide}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Define Purposes
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Create fields for your budget, name them, and set the target amount.
            </Text>

            {fields.map((f, index) => (
              <View key={f.id} style={styles.fieldRow}>
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
                        borderColor: active ? colors.primary : colors.border
                      }
                    ]}
                  >
                    <Text style={{ color: active ? colors.primary : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                      {t}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <Pressable onPress={nextStep} style={[styles.nextBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
            {step === 1 ? "Next: Duration" : "Save Budget"}
          </Text>
          <Feather name={step === 1 ? "arrow-right" : "check"} size={18} color="#fff" />
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
  fieldRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_500Medium" },
  deleteBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", marginTop: 8 },
  durationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  durationCard: { width: "30%", height: 64, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 16 },
  footer: { padding: 16, borderTopWidth: 1 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 16 },
});
