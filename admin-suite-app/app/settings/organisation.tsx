import React, { useState } from "react";
import {
  Alert,
  ActivityIndicator,
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
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiService, getMediaUrl } from "@/services/api";

export default function OrganisationSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();

  // Form Fields
  const [businessName, setBusinessName] = useState(user?.business_name || "");
  const [orgLocation, setOrgLocation] = useState(user?.org_location || "");
  const [orgEmail, setOrgEmail] = useState(user?.org_email || "");
  const [companyLine, setCompanyLine] = useState(user?.company_line || "");
  const [socialHandles, setSocialHandles] = useState(user?.social_handles || "");
  const [totalWorkers, setTotalWorkers] = useState(user?.total_workers || "");
  const [openingTime, setOpeningTime] = useState(user?.opening_time || "");
  const [closingTime, setClosingTime] = useState(user?.closing_time || "");
  const [workingDays, setWorkingDays] = useState(user?.working_days || "");
  const [averageRevenue, setAverageRevenue] = useState(user?.average_revenue || "");
  const [logoUri, setLogoUri] = useState<string | null>(user?.company_logo || null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Logo selection cancelled or failed", err);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setError("");
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("business_name", businessName.trim());
      formData.append("org_location", orgLocation.trim());
      formData.append("org_email", orgEmail.trim());
      formData.append("company_line", companyLine.trim());
      formData.append("social_handles", socialHandles.trim());
      formData.append("total_workers", totalWorkers.trim());
      formData.append("opening_time", openingTime.trim());
      formData.append("closing_time", closingTime.trim());
      formData.append("working_days", workingDays.trim());
      formData.append("average_revenue", averageRevenue.trim());

      if (logoUri && !logoUri.startsWith("http")) {
        const filename = logoUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename || "");
        const type = match ? `image/${match[1]}` : `image`;
        formData.append("company_logo", {
          uri: logoUri,
          name: filename,
          type,
        } as any);
      }

      const res = await apiService.updateMe(formData);
      if (user) {
        setUser({
          ...user,
          ...res.data,
        });
      }

      if (Platform.OS === "web") {
        alert("Organisation details updated successfully!");
        router.back();
      } else {
        Alert.alert("Success", "Organisation details updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update organisation details.");
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
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Organisation Details
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Picker Section */}
        <View style={styles.logoSection}>
          <Pressable onPress={pickLogo} style={[styles.logoOutline, { borderColor: colors.primary }]}>
            {logoUri ? (
              <Image source={{ uri: getMediaUrl(logoUri) }} style={styles.logoImg} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: colors.muted }]}>
                <Feather name="camera" size={24} color={colors.mutedForeground} />
                <Text style={[styles.logoPlaceholderText, { color: colors.mutedForeground }]}>Upload Logo</Text>
              </View>
            )}
          </Pressable>
          <Text style={[styles.logoHint, { color: colors.mutedForeground }]}>
            Tap to upload company logo
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <FormInput
            label="Business Name"
            value={businessName}
            onChangeText={setBusinessName}
            icon="briefcase"
            placeholder="e.g. Northwind Solutions Ltd"
            colors={colors}
          />

          <FormInput
            label="Location/Address"
            value={orgLocation}
            onChangeText={setOrgLocation}
            icon="map-pin"
            placeholder="e.g. 100 Main St, New York"
            colors={colors}
          />

          <FormInput
            label="Business Email"
            value={orgEmail}
            onChangeText={setOrgEmail}
            icon="mail"
            placeholder="e.g. contact@northwind.co"
            colors={colors}
            keyboardType="email-address"
          />

          <FormInput
            label="Company Phone/Line"
            value={companyLine}
            onChangeText={setCompanyLine}
            icon="phone"
            placeholder="e.g. +1 555-0199"
            colors={colors}
            keyboardType="phone-pad"
          />

          <FormInput
            label="Social Handles"
            value={socialHandles}
            onChangeText={setSocialHandles}
            icon="instagram"
            placeholder="e.g. @northwind_solutions"
            colors={colors}
          />

          <FormInput
            label="Total Workers"
            value={totalWorkers}
            onChangeText={setTotalWorkers}
            icon="users"
            placeholder="e.g. 24"
            colors={colors}
            keyboardType="numeric"
          />

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <FormInput
                label="Opening Time"
                value={openingTime}
                onChangeText={setOpeningTime}
                icon="clock"
                placeholder="e.g. 09:00 AM"
                colors={colors}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput
                label="Closing Time"
                value={closingTime}
                onChangeText={setClosingTime}
                icon="clock"
                placeholder="e.g. 05:00 PM"
                colors={colors}
              />
            </View>
          </View>

          <FormInput
            label="Working Days"
            value={workingDays}
            onChangeText={setWorkingDays}
            icon="calendar"
            placeholder="e.g. Monday - Friday"
            colors={colors}
          />

          <FormInput
            label="Average Monthly Revenue"
            value={averageRevenue}
            onChangeText={setAverageRevenue}
            icon="dollar-sign"
            placeholder="e.g. $45,000"
            colors={colors}
          />
        </View>

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: "#ef444415" }]}>
            <Feather name="alert-circle" size={16} color="#ef4444" />
            <Text style={{ color: "#ef4444", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* Save Button */}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  colors,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  icon: keyof typeof Feather.glyphMap;
  placeholder: string;
  colors: any;
  keyboardType?: any;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name={icon} size={16} color={colors.mutedForeground} style={styles.inputIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={[styles.textInput, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
  },
  logoSection: {
    alignItems: "center",
    marginVertical: 20,
    gap: 8,
  },
  logoOutline: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  logoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  logoPlaceholderText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  logoHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    paddingLeft: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 12,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
