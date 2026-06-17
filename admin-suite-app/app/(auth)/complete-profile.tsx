import { FontAwesome6, Feather, AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import React, { useState, useRef } from "react";
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
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoMark } from "@/components/Brand";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { apiService, appendFileToFormData } from "@/services/api";

const { width } = Dimensions.get("window");

// Discovery Sources
const HEARD_FROM_OPTIONS = [
  { value: "youtube", label: "YouTube", icon: "youtube", color: "#ef4444" },
  { value: "tiktok", label: "TikTok", icon: "tiktok", color: "#00f2fe" },
  { value: "facebook", label: "Facebook & Socials", icon: "facebook", color: "#1877f2" },
  { value: "friend", label: "A Friend / Colleague", icon: "user-group", color: "#10b981" },
  { value: "others", label: "Other Sources", icon: "ellipsis", color: "#6366f1" },
] as const;

// Roles
const ROLE_OPTIONS = [
  {
    value: "admin",
    title: "Company Administrator",
    desc: "Manage finances, assign budgets, set up integrations, and view full workspace metrics.",
    icon: "shield",
    gradient: ["#4f46e5", "#312e81"],
  },
  {
    value: "hr",
    title: "HR & People Manager",
    desc: "Oversee employee onboarding, track leave requests, manage initials, performance and shares.",
    icon: "users",
    gradient: ["#10b981", "#064e3b"],
  },
  {
    value: "manager",
    title: "Project / Team Lead",
    desc: "Manage client deliverables, track ongoing projects, assign tasks, and coordinate with clients.",
    icon: "briefcase",
    gradient: ["#f59e0b", "#78350f"],
  },
] as const;

function PreviewRow({ icon, label, value, colors }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
        <Feather name={icon} size={14} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 14, color: colors.foreground, fontFamily: "Inter_500Medium" }}>{value}</Text>
      </View>
    </View>
  );
}

export default function CompleteProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const { setBiometricsEnabled } = useSettings();

  const [currentSlide, setCurrentSlide] = useState(0);
  const slideProgress = useRef(new Animated.Value(0)).current;

  // Form State
  const [name, setName] = useState(user?.name || "");
  const [heardFrom, setHeardFrom] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Organisational details states
  const [businessName, setBusinessName] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [companyLine, setCompanyLine] = useState("");
  const [socialHandles, setSocialHandles] = useState("");
  const [totalWorkers, setTotalWorkers] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [averageRevenue, setAverageRevenue] = useState("");
  const [companyLogoUri, setCompanyLogoUri] = useState<string | null>(null);
  
  // Toggles
  const [biometricsActive, setBiometricsActive] = useState(false);
  const [notificationsActive, setNotificationsActive] = useState(false);

  // Premium plan selection (onboarding slide)
  const [selectedOnboardingPlan, setSelectedOnboardingPlan] = useState("pro");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalSlides = 8;

  const animateToSlide = (index: number) => {
    setCurrentSlide(index);
    Animated.timing(slideProgress, {
      toValue: index / (totalSlides - 1),
      duration: 350,
      useNativeDriver: false,
    }).start();
  };

  const handleNext = () => {
    setError("");
    if (currentSlide === 0 && !heardFrom) {
      setError("Please select how you heard about us.");
      return;
    }
    if (currentSlide === 1 && !role) {
      setError("Please select your primary role.");
      return;
    }
    if (currentSlide === 2) {
      if (!name.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (!location.trim()) {
        setError("Please enter your location.");
        return;
      }
      if (!phone.trim()) {
        setError("Please enter your phone number.");
        return;
      }
    }
    // Organisational details are optional, so we do not validate them.

    if (currentSlide < totalSlides - 1) {
      animateToSlide(currentSlide + 1);
    } else {
      onSubmit();
    }
  };

  const handleBack = () => {
    setError("");
    if (currentSlide > 0) {
      animateToSlide(currentSlide - 1);
    }
  };

  // Pick Avatar
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

  // Pick Company Logo
  const pickCompanyLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setCompanyLogoUri(result.assets[0].uri);
    }
  };

  // Trigger Local Auth to check biometrics
  const enableBiometrics = async () => {
    setError("");
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setError("Biometric authentication is not set up on this device.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable quick access to Admin Suite",
        fallbackLabel: "Use passcode",
      });

      if (result.success) {
        setBiometricsActive(true);
        await setBiometricsEnabled(true);
        setSuccess("Biometric lock enabled successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Authentication failed.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to set up biometrics.");
    }
  };

  // Simulated Push Notification Prompt
  const enableNotifications = () => {
    setNotificationsActive(true);
    setSuccess("Notifications enabled successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // Final Profile Submit to Backend DB
  const onSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("first_name", name.trim());
      formData.append("location", location.trim());
      formData.append("heard_from", heardFrom);
      formData.append("role", role);
      formData.append("phone", phone.trim());
      formData.append("bio", bio.trim());
      formData.append("social_link", socialLink.trim());
      formData.append("biometrics_enabled", biometricsActive ? "true" : "false");
      formData.append("notifications_enabled", notificationsActive ? "true" : "false");
      
      // Organisational details
      formData.append("business_name", businessName.trim());
      formData.append("org_location", orgLocation.trim());
      formData.append("org_email", orgEmail.trim());
      formData.append("company_line", companyLine.trim());
      formData.append("social_handles", socialHandles.trim());
      formData.append("total_workers", totalWorkers);
      formData.append("opening_time", openingTime.trim());
      formData.append("closing_time", closingTime.trim());
      formData.append("working_days", workingDays.join(","));
      formData.append("average_revenue", averageRevenue);

      await appendFileToFormData(formData, "avatar", avatarUri);
      await appendFileToFormData(formData, "company_logo", companyLogoUri);

      const res = await apiService.updateMe(formData);

      if (user) {
        setUser({
          ...user,
          profile_complete: true,
          ...res.data,
          name: name.trim(),
          initials: (name.trim() || res.data.name || user.name || user.username || user.email || "US").slice(0, 2).toUpperCase(),
        });
      }

      // Finish Onboarding and redirect directly to Tabs
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Profile submit error:", err);
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

  // Render slides dynamically
  const renderSlideContent = () => {
    switch (currentSlide) {
      case 0:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Where did you hear about us?
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Help us customize your workspace journey.
            </Text>
            <View style={styles.optionsList}>
              {HEARD_FROM_OPTIONS.map((opt) => {
                const isSelected = heardFrom === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setHeardFrom(opt.value)}
                    style={({ pressed }) => [
                      styles.choiceCard,
                      {
                        backgroundColor: isSelected ? colors.primary + "12" : colors.muted,
                        borderColor: isSelected ? colors.primary : colors.border,
                        opacity: pressed ? 0.92 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: opt.color + "18" }]}>
                      <FontAwesome6 name={opt.icon} size={18} color={opt.color} />
                    </View>
                    <Text style={[styles.choiceText, { color: colors.foreground, fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              What is your primary role?
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              We'll tailor your dashboard apps based on your choice.
            </Text>
            <View style={styles.optionsList}>
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = role === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRole(opt.value)}
                    style={({ pressed }) => [
                      styles.roleCard,
                      {
                        backgroundColor: isSelected ? colors.primary + "06" : colors.muted,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                        opacity: pressed ? 0.92 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={opt.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.roleGradient}
                    >
                      <Feather name={opt.icon as any} size={20} color="#fff" />
                    </LinearGradient>
                    <View style={styles.roleTextContainer}>
                      <Text style={[styles.roleTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.roleDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {opt.desc}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Tell us about yourself
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              This will update your public profile workspace.
            </Text>

            {/* Avatar Section */}
            <View style={styles.avatarWrap}>
              <Pressable onPress={pickAvatar} style={styles.avatarCircle}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="camera" size={32} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                  <Feather name="plus" size={14} color={colors.primaryForeground} />
                </View>
              </Pressable>
              <Text style={[styles.avatarSubtext, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", textAlign: "center" }]}>
                Add Profile Photo{"\n"}
                <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular" }}>(Tap circle to select & crop photo)</Text>
              </Text>
            </View>

            {/* Fields */}
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Full Name
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, marginBottom: 12 }]}>
              <Feather name="user" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. John Doe"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Location
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="map-pin" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Lagos, Nigeria"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
              Phone Number
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="phone" size={16} color={colors.mutedForeground} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+234 80 1234 5678"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
              Short Bio (Optional)
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, height: 70, alignItems: "flex-start", paddingVertical: 10 }]}>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Brief summary..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={2}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium", height: "100%" }]}
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Organisational Details (Optional)
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Enter details about your organization or business. You can skip this step.
            </Text>

            {/* Company Logo Section */}
            <View style={styles.avatarWrap}>
              <Pressable onPress={pickCompanyLogo} style={styles.avatarCircle}>
                {companyLogoUri ? (
                  <Image source={{ uri: companyLogoUri }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="image" size={32} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                  <Feather name="plus" size={14} color={colors.primaryForeground} />
                </View>
              </Pressable>
              <Text style={[styles.avatarSubtext, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Upload Company Logo (Optional)
              </Text>
            </View>

            {/* Business Name */}
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Business Name
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, marginBottom: 12, backgroundColor: colors.card }]}>
              <Feather name="briefcase" size={16} color={colors.mutedForeground} />
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Acme Corp"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>

            {/* Business Location */}
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Business Location
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, marginBottom: 12, backgroundColor: colors.card }]}>
              <Feather name="map-pin" size={16} color={colors.mutedForeground} />
              <TextInput
                value={orgLocation}
                onChangeText={setOrgLocation}
                placeholder="e.g. New York, USA"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>

            {/* Business Email */}
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Business Email
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, marginBottom: 12, backgroundColor: colors.card }]}>
              <Feather name="mail" size={16} color={colors.mutedForeground} />
              <TextInput
                value={orgEmail}
                onChangeText={setOrgEmail}
                placeholder="e.g. contact@acme.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>

            {/* Company Line & Social Handles in a row */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Company Phone
                </Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
                  <Feather name="phone" size={16} color={colors.mutedForeground} />
                  <TextInput
                    value={companyLine}
                    onChangeText={setCompanyLine}
                    placeholder="+1 555 1234"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Social Handles
                </Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
                  <Feather name="globe" size={16} color={colors.mutedForeground} />
                  <TextInput
                    value={socialHandles}
                    onChangeText={setSocialHandles}
                    placeholder="e.g. @acme_inc"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
                  />
                </View>
              </View>
            </View>

            {/* Total Workers Selectable Cards */}
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 8 }]}>
              Total Workers
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {["1-5", "6-20", "21-100", "100+"].map((range) => {
                const isSel = totalWorkers === range;
                return (
                  <Pressable
                    key={range}
                    onPress={() => setTotalWorkers(range)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 46,
                      borderWidth: 1.5,
                      borderRadius: 12,
                      borderColor: isSel ? colors.primary : colors.border,
                      backgroundColor: isSel ? colors.primary + "12" : colors.card,
                      justifyContent: "center",
                      alignItems: "center",
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{
                      color: isSel ? colors.primary : colors.foreground,
                      fontSize: 13,
                      fontFamily: isSel ? "Inter_600SemiBold" : "Inter_500Medium",
                    }}>
                      {range}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Operating Hours (Opening & Closing) in a row */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Opening Time
                </Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
                  <Feather name="clock" size={16} color={colors.mutedForeground} />
                  <TextInput
                    value={openingTime}
                    onChangeText={setOpeningTime}
                    placeholder="e.g. 09:00 AM"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Closing Time
                </Text>
                <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
                  <Feather name="clock" size={16} color={colors.mutedForeground} />
                  <TextInput
                    value={closingTime}
                    onChangeText={setClosingTime}
                    placeholder="e.g. 05:00 PM"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
                  />
                </View>
              </View>
            </View>

            {/* Working Days Selectable Tags */}
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 8 }]}>
              Working Days
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                const isSel = workingDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => {
                      if (isSel) {
                        setWorkingDays(workingDays.filter((d) => d !== day));
                      } else {
                        setWorkingDays([...workingDays, day]);
                      }
                    }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      height: 38,
                      borderRadius: 19,
                      borderWidth: 1.5,
                      borderColor: isSel ? colors.primary : colors.border,
                      backgroundColor: isSel ? colors.primary + "12" : colors.card,
                      justifyContent: "center",
                      alignItems: "center",
                      transform: [{ scale: pressed ? 0.93 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{
                      color: isSel ? colors.primary : colors.foreground,
                      fontSize: 12,
                      fontFamily: isSel ? "Inter_600SemiBold" : "Inter_500Medium",
                    }}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Average Revenue Selectable Cards */}
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 8 }]}>
              Average Revenue (Annual)
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {["< $50k", "$50k-$250k", "$250k-$1M", "$1M+"].map((rev) => {
                const isSel = averageRevenue === rev;
                return (
                  <Pressable
                    key={rev}
                    onPress={() => setAverageRevenue(rev)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 46,
                      borderWidth: 1.5,
                      borderRadius: 12,
                      borderColor: isSel ? colors.primary : colors.border,
                      backgroundColor: isSel ? colors.primary + "12" : colors.card,
                      justifyContent: "center",
                      alignItems: "center",
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{
                      color: isSel ? colors.primary : colors.foreground,
                      fontSize: 12,
                      textAlign: "center",
                      fontFamily: isSel ? "Inter_600SemiBold" : "Inter_500Medium",
                    }}>
                      {rev}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Secure Your Workspace
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Keep employee details, shares, budgets, and transactions safe with biometrics.
            </Text>

            <View style={styles.heroCenter}>
              <View style={[
                styles.shieldRing,
                {
                  backgroundColor: (biometricsActive ? "#10b981" : "#3b82f6") + "12",
                  borderColor: (biometricsActive ? "#10b981" : "#3b82f6") + "24",
                }
              ]}>
                <Feather name="lock" size={64} color={biometricsActive ? "#10b981" : "#3b82f6"} />
              </View>
              <Text style={[styles.heroHeading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {biometricsActive ? "Biometrics Active" : "Instant Authentication"}
              </Text>
              <Text style={[styles.heroText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Use your device's Touch ID or Face ID fingerprint lock for instant security verification.
              </Text>

              <Pressable
                onPress={enableBiometrics}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: biometricsActive ? "#10b981" : "#3b82f6",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather
                  name={biometricsActive ? "check" : "smartphone"}
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={[
                  styles.actionBtnText,
                  {
                    fontFamily: "Inter_600SemiBold",
                    color: "#fff",
                  }
                ]}>
                  {biometricsActive ? "Enabled" : "Enable Biometrics"}
                </Text>
              </Pressable>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Never Miss a Beat
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Stay updated with team requests, task completions, and budget notifications.
            </Text>

            <View style={styles.heroCenter}>
              <View style={[
                styles.shieldRing,
                {
                  backgroundColor: (notificationsActive ? "#10b981" : "#3b82f6") + "12",
                  borderColor: (notificationsActive ? "#10b981" : "#3b82f6") + "24",
                }
              ]}>
                <Feather name="bell" size={64} color={notificationsActive ? "#10b981" : "#3b82f6"} />
              </View>
              <Text style={[styles.heroHeading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {notificationsActive ? "Notifications Active" : "Stay Alerted"}
              </Text>
              <Text style={[styles.heroText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Get real-time updates regarding company deliverables, payroll status, and net profits directly.
              </Text>

              <Pressable
                onPress={enableNotifications}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: notificationsActive ? "#10b981" : "#3b82f6",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather
                  name={notificationsActive ? "check" : "bell-off"}
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={[
                  styles.actionBtnText,
                  {
                    fontFamily: "Inter_600SemiBold",
                    color: "#fff",
                  }
                ]}>
                  {notificationsActive ? "Enabled" : "Enable Push Notifications"}
                </Text>
              </Pressable>
            </View>
          </View>
        );

      case 6:
        // ── PREMIUM PLAN SELECTION ──
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Choose Your Plan
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Start free for 14 days. No card needed to begin.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              {[
                { id: "starter", name: "Starter", price: "$19", desc: "Perfect for small teams (up to 10)", color: "#6366f1", icon: "bolt-lightning", features: ["10 employees", "Basic HR", "Chat"] },
                { id: "pro", name: "Pro", price: "$49", desc: "Growing businesses (up to 100)", color: "#f59e0b", icon: "crown", badge: "Most Popular", features: ["100 employees", "Full HR & Payroll", "Analytics", "Multi-branch"] },
                { id: "enterprise", name: "Enterprise", price: "$129", desc: "Unlimited scale & custom branding", color: "#10b981", icon: "building", features: ["Unlimited employees", "API access", "Dedicated manager", "SLA guarantee"] },
              ].map((plan) => {
                const isSelected = selectedOnboardingPlan === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => setSelectedOnboardingPlan(plan.id)}
                    style={[{
                      borderRadius: 18,
                      padding: 16,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? plan.color : colors.border,
                      backgroundColor: isSelected ? plan.color + "10" : colors.muted,
                    }]}
                  >
                    {(plan as any).badge && (
                      <View style={{ position: "absolute", top: 12, right: 12, backgroundColor: plan.color, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 }}>{(plan as any).badge}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: plan.color + "20", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <FontAwesome6 name={plan.icon as any} size={16} color={plan.color} solid />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>{plan.name}</Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>{plan.desc}</Text>
                      </View>
                      {isSelected && (
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: plan.color, alignItems: "center", justifyContent: "center" }}>
                          <Feather name="check" size={12} color="#fff" />
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginBottom: 10 }}>
                      <Text style={{ color: plan.color, fontFamily: "Inter_700Bold", fontSize: 28 }}>{plan.price}</Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, paddingBottom: 4 }}>/month</Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {plan.features.map((f) => (
                        <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: plan.color + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Feather name="check" size={10} color={plan.color} />
                          <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 11 }}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => router.push("/premium" as any)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 }}
              >
                <Feather name="external-link" size={13} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>See full plan comparison</Text>
              </Pressable>
            </ScrollView>
          </View>
        );

      case 7:
        // ── REVIEW SLIDE (was case 6) ──
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Verify Profile Details
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Do you like your profile like this, or do you want to make changes?
            </Text>

            <ScrollView style={{ flex: 1, maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.choiceCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, padding: 18, borderRadius: 20, flexDirection: "column", gap: 14, alignItems: "stretch" }]}>
                
                {/* Header Summary */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <View>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={{ width: 64, height: 64, borderRadius: 32 }} />
                    ) : (
                      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}>
                        <Feather name="user" size={28} color={colors.mutedForeground} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, color: colors.foreground, fontFamily: "Inter_700Bold" }}>
                      {name || "Your Name"}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.primary, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" }}>
                      {role === "admin" ? "Company Administrator" : role === "hr" ? "HR & People Manager" : role === "manager" ? "Project / Team Lead" : "Team Member"}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border }} />

                {/* Details Grid */}
                <View style={{ gap: 12 }}>
                  <PreviewRow icon="map-pin" label="Location" value={location || "Not specified"} colors={colors} />
                  <PreviewRow icon="phone" label="Phone" value={phone || "Not specified"} colors={colors} />
                  <PreviewRow icon="file-text" label="Bio" value={bio || "No bio added"} colors={colors} />
                  <PreviewRow icon="info" label="Heard From" value={heardFrom || "Not specified"} colors={colors} />
                </View>

                {/* Org details if filled */}
                {(businessName || orgLocation || orgEmail) && (
                  <>
                    <View style={{ height: 1, backgroundColor: colors.border }} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 0.5 }}>ORGANISATION DETAILS</Text>
                    <View style={{ gap: 12 }}>
                      {businessName ? <PreviewRow icon="briefcase" label="Business Name" value={businessName} colors={colors} /> : null}
                      {orgLocation ? <PreviewRow icon="map-pin" label="Business Location" value={orgLocation} colors={colors} /> : null}
                      {orgEmail ? <PreviewRow icon="mail" label="Business Email" value={orgEmail} colors={colors} /> : null}
                      {companyLine ? <PreviewRow icon="phone" label="Company Phone" value={companyLine} colors={colors} /> : null}
                      {totalWorkers ? <PreviewRow icon="users" label="Workers Count" value={totalWorkers} colors={colors} /> : null}
                    </View>
                  </>
                )}

                <View style={{ height: 1, backgroundColor: colors.border }} />
                
                {/* Security choices */}
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Feather name="shield" size={16} color={biometricsActive ? colors.success : colors.mutedForeground} />
                    <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_500Medium" }}>
                      Biometrics: {biometricsActive ? "Enabled" : "Disabled"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Feather name="bell" size={16} color={notificationsActive ? colors.success : colors.mutedForeground} />
                    <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: "Inter_500Medium" }}>
                      Notifications: {notificationsActive ? "Enabled" : "Disabled"}
                    </Text>
                  </View>
                </View>

              </View>

              <Pressable
                onPress={() => animateToSlide(2)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    marginTop: 14,
                    backgroundColor: colors.card,
                    opacity: pressed ? 0.8 : 1
                  }
                ]}
              >
                <Feather name="edit-2" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  Make Changes
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Onboarding Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.topRow}>
            <Pressable onPress={handleBack} disabled={currentSlide === 0} style={{ opacity: currentSlide === 0 ? 0.2 : 1 }}>
              <Feather name="arrow-left" size={24} color={colors.foreground} />
            </Pressable>
            <View style={styles.headerLogo}>
              <LogoMark size={28} tint={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                Admin Suite
              </Text>
            </View>
            <Text style={[styles.stepIndicator, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              {currentSlide + 1} / {totalSlides}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressBarBg, { backgroundColor: colors.muted }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.primary,
                  width: slideProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["20%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Slide Content Card */}
        <View style={styles.card}>
          {renderSlideContent()}

          {/* Notification Messages */}
          {error ? (
            <View style={[styles.messageBox, { backgroundColor: colors.danger + "12" }]}>
              <Feather name="alert-circle" size={14} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={[styles.messageText, { color: colors.danger, fontFamily: "Inter_500Medium" }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {success ? (
            <View style={[styles.messageBox, { backgroundColor: "#10b98112" }]}>
              <Feather name="check-circle" size={14} color="#10b981" style={{ marginRight: 6 }} />
              <Text style={[styles.messageText, { color: "#10b981", fontFamily: "Inter_500Medium" }]}>
                {success}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          <PrimaryButton
            label={currentSlide === totalSlides - 1 ? "Finish Onboarding" : "Next Step"}
            onPress={handleNext}
            loading={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    letterSpacing: -0.4,
  },
  stepIndicator: {
    fontSize: 13,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 3,
    marginTop: 18,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  card: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  slideContainer: {
    flex: 1,
  },
  slideTitle: {
    fontSize: 26,
    letterSpacing: -0.7,
    marginBottom: 10,
  },
  slideSub: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceText: {
    fontSize: 15,
    marginLeft: 14,
    flex: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCard: {
    flexDirection: "row",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  roleGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  avatarWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarCircle: {
    position: "relative",
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarSubtext: {
    fontSize: 12,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  heroCenter: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  shieldRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#312e8110",
    borderWidth: 1,
    borderColor: "#312e8118",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroHeading: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  heroText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  actionBtn: {
    flexDirection: "row",
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  messageText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
});
