import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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

export default function CreateTransactionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refresh } = useData();
  const params = useLocalSearchParams();
  const isIncome = params.type === "income";

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(isIncome ? "Sales" : "Office");
  const [saving, setSaving] = useState(false);

  const categories = isIncome 
    ? ["Sales", "Investment", "Service", "Direct Deposit", "Other"] 
    : ["Salaries", "Rent", "Marketing", "Utility", "Office", "Travel", "Taxes", "Other"];

  const handleSave = async () => {
    if (saving) return;
    if (!amount || !desc) return;
    
    setSaving(true);
    const payload = {
      type: isIncome ? "income" : "expense",
      amount: parseFloat(amount) || 0,
      description: desc,
      category: category,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };

    try {
      await apiService.createTransaction(payload);
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
          Add {isIncome ? "Income" : "Expenditure"}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Amount</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontSize: 24, height: 60, fontFamily: "Inter_700Bold" }]}
            placeholder="0.00"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Category</Text>
          <View style={styles.chipGrid}>
            {categories.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: category === c ? (isIncome ? colors.success : colors.danger) : colors.card,
                    borderColor: category === c ? (isIncome ? colors.success : colors.danger) : colors.border,
                  },
                ]}
              >
                <Text style={{ color: category === c ? "#fff" : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Description</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="What was this for?"
            placeholderTextColor={colors.mutedForeground}
            value={desc}
            onChangeText={setDesc}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border }]}>
        <Pressable onPress={handleSave} disabled={saving} style={[styles.submitBtn, { backgroundColor: isIncome ? colors.success : colors.danger, opacity: saving ? 0.7 : 1 }]}>
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
            {saving ? "Saving..." : "Save Record"}
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
  footer: { padding: 16, borderTopWidth: 1 },
  submitBtn: { height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});
