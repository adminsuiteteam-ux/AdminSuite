import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoMark } from "@/components/Brand";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";

// ── Country codes list ────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+51", flag: "🇵🇪", name: "Peru" },
];

// ── "Heard from" options ──────────────────────────────────────────────────
const HEARD_FROM_OPTIONS = [
  { value: "youtube", label: "YouTube", icon: "play-circle" },
  { value: "tiktok", label: "TikTok", icon: "music" },
  { value: "facebook", label: "Facebook", icon: "facebook" },
  { value: "friend", label: "Friend", icon: "users" },
  { value: "others", label: "Others", icon: "more-horizontal" },
] as const;

export default function CompleteProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // ── Pick avatar image ─────────────────────────────────────────────────
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // ── Submit profile ────────────────────────────────────────────────────
  const onSubmit = async () => {
    setError("");

    if (!location.trim()) {
      setError("Please enter your location.");
      return;
    }
    if (!heardFrom) {
      setError("Please select where you heard about the app.");
      return;
    }
    if (!phoneNumber.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${countryCode.code}${phoneNumber.trim()}`;
      const formData = new FormData();
      formData.append("location", location.trim());
      formData.append("heard_from", heardFrom);
      formData.append("phone", fullPhone);
      formData.append("bio", bio.trim());
      formData.append("social_link", socialLink.trim());

      if (avatarUri) {
        const filename = avatarUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("avatar", {
          uri: avatarUri,
          name: filename,
          type,
        } as any);
      }

      const res = await apiService.updateMe(formData);

      // Update user in context with profile_complete = true
      if (user) {
        setUser({
          ...user,
          profile_complete: true,
          ...res.data,
          initials: ((res.data.name || user.name || user.username || user.email || "US")).slice(0, 2).toUpperCase(),
        });
      }

      router.replace("/tour");
    } catch (err: any) {
      const backendErrors = err.response?.data;
      if (backendErrors) {
        const firstError = Object.values(backendErrors)[0];
        setError(Array.isArray(firstError) ? (firstError as string[])[0] : "Failed to save profile.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Filter countries for search ───────────────────────────────────────
  const filteredCountries = countrySearch
    ? COUNTRY_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.code.includes(countrySearch)
      )
    : COUNTRY_CODES;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <LinearGradient
            colors={["#312e81", "#4f46e5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.headerInner}>
            <View style={styles.logoChip}>
              <LogoMark size={32} tint="#ffffff" />
            </View>
            <Text style={[styles.welcome, { fontFamily: "Inter_700Bold" }]}>
              Complete Your Profile
            </Text>
            <Text style={[styles.sub, { fontFamily: "Inter_400Regular" }]}>
              Tell us a bit about yourself to get started
            </Text>
          </View>
        </View>

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: colors.muted },
                  ]}
                >
                  <Feather name="camera" size={28} color={colors.mutedForeground} />
                </View>
              )}
              <View
                style={[
                  styles.avatarBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Feather name="plus" size={12} color="#fff" />
              </View>
            </Pressable>
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                color: colors.mutedForeground,
                marginTop: 8,
              }}
            >
              Tap to add profile photo
            </Text>
          </View>

          {/* Location */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Location
          </Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, borderRadius: colors.radius }]}>
            <Feather name="map-pin" size={16} color={colors.mutedForeground} />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. New York, USA"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
            />
          </View>

          {/* Heard From */}
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>
            Where did you hear about us?
          </Text>
          <View style={styles.heardFromRow}>
            {HEARD_FROM_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setHeardFrom(opt.value)}
                style={[
                  styles.heardFromChip,
                  {
                    backgroundColor:
                      heardFrom === opt.value
                        ? colors.primary + "18"
                        : colors.muted,
                    borderColor:
                      heardFrom === opt.value
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              >
                <Feather
                  name={opt.icon as any}
                  size={14}
                  color={heardFrom === opt.value ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    color: heardFrom === opt.value ? colors.primary : colors.mutedForeground,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Phone */}
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>
            Phone Number
          </Text>
          <View style={styles.phoneRow}>
            <Pressable
              onPress={() => setShowCountryPicker(true)}
              style={[
                styles.countryCodeBtn,
                { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.muted },
              ]}
            >
              <Text style={{ fontSize: 18 }}>{countryCode.flag}</Text>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                  color: colors.foreground,
                }}
              >
                {countryCode.code}
              </Text>
              <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
            </Pressable>
            <View
              style={[
                styles.inputWrap,
                {
                  flex: 1,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone number"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>
          </View>

          {/* Bio */}
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>
            Bio
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                borderColor: colors.border,
                borderRadius: colors.radius,
                height: 100,
                alignItems: "flex-start",
                paddingVertical: 12,
              },
            ]}
          >
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                { color: colors.foreground, fontFamily: "Inter_500Medium", height: "100%" },
              ]}
            />
          </View>

          {/* Social Media Link */}
          <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>
            Social Media Link
          </Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, borderRadius: colors.radius }]}>
            <Feather name="link" size={16} color={colors.mutedForeground} />
            <TextInput
              value={socialLink}
              onChangeText={setSocialLink}
              placeholder="https://linkedin.com/in/yourname"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
            />
          </View>

          {/* Error */}
          {error ? (
            <View style={[styles.errorWrap, { backgroundColor: colors.danger + "15" }]}>
              <Feather name="alert-circle" size={14} color={colors.danger} />
              <Text
                style={{
                  color: colors.danger,
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  flex: 1,
                }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Submit */}
          <View style={{ marginTop: 22 }}>
            <PrimaryButton
              label="Complete Profile"
              onPress={onSubmit}
              loading={loading}
            />
          </View>
        </View>
      </ScrollView>

      {/* ── Country Picker Modal ─────────────────────────────────────── */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  color: colors.foreground,
                }}
              >
                Select Country
              </Text>
              <Pressable onPress={() => setShowCountryPicker(false)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View
              style={[
                styles.searchWrap,
                { borderColor: colors.border, backgroundColor: colors.muted },
              ]}
            >
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search country..."
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  { color: colors.foreground, fontFamily: "Inter_500Medium" },
                ]}
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item, i) => `${item.code}-${item.name}-${i}`}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCountryCode(item);
                    setShowCountryPicker(false);
                    setCountrySearch("");
                  }}
                  style={[
                    styles.countryRow,
                    {
                      backgroundColor:
                        countryCode.name === item.name && countryCode.code === item.code
                          ? colors.primary + "12"
                          : "transparent",
                    },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 15,
                        color: colors.foreground,
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        color: colors.mutedForeground,
                      }}
                    >
                      {item.code}
                    </Text>
                  </View>
                  {countryCode.name === item.name && countryCode.code === item.code && (
                    <Feather name="check" size={18} color={colors.primary} />
                  )}
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 80,
    paddingHorizontal: 24,
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerInner: { gap: 14 },
  logoChip: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  welcome: {
    color: "#fff",
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  sub: { color: "rgba(255,255,255,0.75)", fontSize: 14 },
  card: {
    marginTop: -56,
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: "Inter_500Medium",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  heardFromRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heardFromChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
  },
  countryCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
  },
  errorWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  // ── Modal styles ────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
