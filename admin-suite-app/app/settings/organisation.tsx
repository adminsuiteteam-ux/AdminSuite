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

  const isCreated = !!user?.business_name;
  const [isEditing, setIsEditing] = useState(!isCreated);

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

    if (!businessName.trim()) {
      setError("Business Name is required.");
      return;
    }

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
        setIsEditing(false);
      } else {
        Alert.alert("Success", "Organisation details updated successfully!", [
          { text: "OK", onPress: () => setIsEditing(false) },
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update organisation details.");
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            Organisation Profile
          </Text>
          <Pressable
            onPress={() => setIsEditing(true)}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            hitSlop={10}
          >
            <Feather name="edit-2" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Company Name Card */}
          <View style={[profileStyles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[profileStyles.logoContainer, { borderColor: colors.primary }]}>
              {user?.company_logo ? (
                <Image source={{ uri: getMediaUrl(user.company_logo) }} style={profileStyles.logoImg} />
              ) : (
                <View style={[profileStyles.logoPlaceholder, { backgroundColor: colors.muted }]}>
                  <Feather name="briefcase" size={36} color={colors.mutedForeground} />
                </View>
              )}
            </View>
            <Text style={[profileStyles.businessName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {user?.business_name || "Your Business Name"}
            </Text>
            {user?.org_email ? (
              <Text style={[profileStyles.businessEmail, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {user.org_email}
              </Text>
            ) : null}
          </View>

          {/* Details Section */}
          <Text style={[profileStyles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            BUSINESS DIRECTORY
          </Text>
          <View style={[profileStyles.detailsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoRow icon="map-pin" label="Location / Address" value={user?.org_location || "Not set"} colors={colors} />
            <InfoRow icon="phone" label="Company Phone" value={user?.company_line || "Not set"} colors={colors} />
            <InfoRow icon="instagram" label="Social Handles" value={user?.social_handles || "Not set"} colors={colors} />
            <InfoRow icon="users" label="Total Workers" value={user?.total_workers || "Not set"} colors={colors} />
            <InfoRow icon="dollar-sign" label="Average Annual Revenue" value={user?.average_revenue || "Not set"} colors={colors} />
          </View>

          <Text style={[profileStyles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>
            OPERATING HOURS
          </Text>
          <View style={[profileStyles.detailsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoRow icon="clock" label="Opening Time" value={user?.opening_time || "Not set"} colors={colors} />
            <InfoRow icon="clock" label="Closing Time" value={user?.closing_time || "Not set"} colors={colors} />
            <InfoRow icon="calendar" label="Working Days" value={user?.working_days || "Not set"} colors={colors} />
          </View>

          {/* Edit Button */}
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 32 }]}
            onPress={() => setIsEditing(true)}
          >
            <Feather name="edit" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Edit Organisation Details</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => {
            if (isCreated) {
              setIsEditing(false);
            } else {
              router.back();
            }
          }}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {isCreated ? "Edit Organisation" : "Create Organisation"}
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
              <Image source={{ uri: logoUri.startsWith("http") ? logoUri : logoUri }} style={styles.logoImg} />
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
            label="Business Name *"
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
              <Text style={styles.saveBtnText}>{isCreated ? "Save Changes" : "Create Organisation"}</Text>
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

function InfoRow({ icon, label, value, colors }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; colors: any }) {
  return (
    <View style={profileStyles.infoRow}>
      <View style={[profileStyles.infoIconWrap, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={profileStyles.infoTextWrap}>
        <Text style={[profileStyles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[profileStyles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  heroCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 16,
  },
  logoImg: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
  },
  logoPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  businessName: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 4,
  },
  businessEmail: {
    fontSize: 14,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    paddingLeft: 4,
    marginBottom: 8,
  },
  detailsGrid: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});

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
