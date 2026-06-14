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

import { PrimaryButton } from "@/components/PrimaryButton";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";

export default function CreateSavingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refresh } = useData();

  // Savings model: name, target, saved, purpose
  const [name, setName] = useState("");           // e.g. "Office Expansion Fund"
  const [purpose, setPurpose] = useState("");     // short descriptor
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("0");
  const [saving, setSaving] = useState(false);

  const isFormValid =
    name.trim() &&
    purpose.trim() &&
    targetAmount.trim() &&
    parseFloat(targetAmount) > 0;

  const handleSave = async () => {
    if (!isFormValid) return;
    setSaving(true);
    try {
      await apiService.createSavings({
        name: name.trim(),
        purpose: purpose.trim(),
        target: parseFloat(targetAmount) || 0,
        saved: parseFloat(savedAmount) || 0,
      });
      await refresh();
      router.back();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        Object.values(err?.response?.data || {})?.[0]?.[0] ||
        "Failed to save. Please try again.";
      Alert.alert("Save Failed", String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Add Savings Goal
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 20 }}>

          {/* Goal Name */}
          <View>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Goal Name *
            </Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, borderRadius: (colors as any).radius ?? 12, backgroundColor: colors.card }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Office Expansion Fund"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>
          </View>

          {/* Purpose */}
          <View>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Purpose *
            </Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, borderRadius: (colors as any).radius ?? 12, backgroundColor: colors.card }]}>
              <TextInput
                value={purpose}
                onChangeText={setPurpose}
                placeholder="e.g. New branch setup"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>
          </View>

          {/* Target Amount */}
          <View>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Target Amount *
            </Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, borderRadius: (colors as any).radius ?? 12, backgroundColor: colors.card }]}>
              <Text style={{ color: colors.mutedForeground, marginRight: 8, fontFamily: "Inter_500Medium", fontSize: 16 }}>$</Text>
              <TextInput
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>
          </View>

          {/* Amount Already Saved (optional) */}
          <View>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Already Saved (optional)
            </Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, borderRadius: (colors as any).radius ?? 12, backgroundColor: colors.card }]}>
              <Text style={{ color: colors.mutedForeground, marginRight: 8, fontFamily: "Inter_500Medium", fontSize: 16 }}>$</Text>
              <TextInput
                value={savedAmount}
                onChangeText={setSavedAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 }}>
              Enter any amount you have already set aside for this goal.
            </Text>
          </View>

          {/* Live progress preview */}
          {parseFloat(targetAmount) > 0 && (
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5, marginBottom: 10 }}>
                GOAL PREVIEW
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15 }}>{name || "Goal"}</Text>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                  ${parseFloat(savedAmount || "0").toFixed(2)} / ${parseFloat(targetAmount || "0").toFixed(2)}
                </Text>
              </View>
              <View style={[styles.barBg, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${Math.min(100, Math.round((parseFloat(savedAmount || "0") / parseFloat(targetAmount)) * 100))}%`,
                    },
                  ]}
                />
              </View>
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 6, textAlign: "right" }}>
                {Math.min(100, Math.round((parseFloat(savedAmount || "0") / parseFloat(targetAmount)) * 100))}% of target
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
          label={saving ? "Saving…" : "Save Goal"}
          onPress={handleSave}
          disabled={!isFormValid || saving}
          icon={
            saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Feather name="check" size={16} color="#fff" />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  label: {
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  previewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  barBg: { height: 8, borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999 },
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
