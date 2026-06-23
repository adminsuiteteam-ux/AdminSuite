import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { CURRENCIES, useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";
import { useTranslation } from "react-i18next";
import { registerForPushNotificationsAsync, unregisterFromPushNotificationsAsync } from "@/services/notifications";

export default function AppSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout, user, setUser } = useAuth();
  const {
    currency,
    setCurrency,
    theme,
    setTheme,
    biometricsEnabled,
    setBiometricsEnabled,
  } = useSettings();
  const { t } = useTranslation();
  const [notif, setNotif] = useState(user?.notifications_enabled ?? false);

  const handleToggleNotifications = async (value: boolean) => {
    setNotif(value);
    try {
      await apiService.updateMe({ notifications_enabled: value });
      if (user) {
        setUser({ ...user, notifications_enabled: value });
      }
      if (value) {
        await registerForPushNotificationsAsync();
      } else {
        await unregisterFromPushNotificationsAsync();
      }
    } catch (err) {
      console.error("Failed to toggle notifications:", err);
      Alert.alert("Error", "Failed to update notification settings. Please check your connection.");
      setNotif(!value);
    }
  };
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleToggleBiometrics = async (value: boolean) => {
    if (value) {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          Alert.alert(
            "Biometrics Unavailable",
            "Your device does not support biometric authentication or you have not enrolled any fingerprints/faces."
          );
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Confirm biometric setup",
          fallbackLabel: "Cancel",
          disableDeviceFallback: true,
        });

        if (result.success) {
          await setBiometricsEnabled(true);
        }
      } catch (err) {
        console.error("Biometrics setup failed:", err);
        Alert.alert("Error", "Could not set up biometric authentication.");
      }
    } else {
      await setBiometricsEnabled(false);
    }
  };

  const onLogout = () => {
    setSignOutOpen(true);
  };

  const handleConfirmLogout = async () => {
    setSignOutOpen(false);
    await logout();
    router.replace("/(auth)/login");
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await apiService.deleteAccount();
      setDeleteAccountOpen(false);
      await logout();
      router.replace("/(auth)/login");
    } catch (e: any) {
      console.error("Delete account failed:", e);
      Alert.alert("Error", "Failed to delete account. Please try again later.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {t("settings.settingsTitle")}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

        <Group title={t("settings.preferences")}>
          <Row
            icon="dollar-sign"
            label={t("settings.currency")}
            hint={`${currency.symbol}  ${currency.code} · ${currency.name}`}
            onPress={() => setCurrencyOpen(true)}
          />
          <ToggleRow
            icon="bell"
            label={t("settings.pushNotifications")}
            value={notif}
            onValueChange={handleToggleNotifications}
          />
          <ToggleRow
            icon="lock"
            label={t("settings.biometricLogin")}
            value={biometricsEnabled}
            onValueChange={handleToggleBiometrics}
          />
          <Row icon="moon" label={t("settings.appearance")} hint={theme === "system" ? t("settings.systemDefault") : theme === "dark" ? t("settings.darkMode") : t("settings.lightMode")} onPress={() => setAppearanceOpen(true)} />
        </Group>

        <Group title={t("settings.account")}>
          <Row icon="help-circle" label={t("settings.helpSupport")} onPress={() => router.push("/settings/help" as any)} />
          <Row icon="file-text" label={t("settings.privacyPolicy")} onPress={() => router.push("/settings/privacy" as any)} />
          <Pressable onPress={onLogout}>
            <View
              style={[
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.danger + "1A" }]}>
                <Feather name="log-out" size={16} color={colors.danger} />
              </View>
              <Text style={{ color: colors.danger, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 }}>
                {t("settings.signOutAction")}
              </Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>

          <Pressable onPress={() => setDeleteAccountOpen(true)} style={{ marginTop: 8 }}>
            <View
              style={[
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={[styles.rowIcon, { backgroundColor: colors.danger + "1A" }]}>
                <Feather name="trash-2" size={16} color={colors.danger} />
              </View>
              <Text style={{ color: colors.danger, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 }}>
                {t("settings.deleteAccount")}
              </Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>
        </Group>

        <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          {t("settings.poweredBy")}
        </Text>
      </ScrollView>

      <CurrencyPicker
        visible={currencyOpen}
        onClose={() => setCurrencyOpen(false)}
        selectedCode={currency.code}
        onSelect={async (code) => {
          await setCurrency(code);
          setCurrencyOpen(false);
        }}
      />

      <AppearancePicker
        visible={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        selectedTheme={theme}
        onSelect={async (mode) => {
          await setTheme(mode);
          setAppearanceOpen(false);
        }}
      />

      <SignOutModal
        visible={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      <DeleteAccountModal
        visible={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        onConfirm={handleConfirmDeleteAccount}
        loading={deleteLoading}
      />
    </View>
  );
}

function CurrencyPicker({ visible, onClose, selectedCode, onSelect }: { visible: boolean; onClose: () => void; selectedCode: string; onSelect: (code: string) => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{t("settings.chooseCurrency")}</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>{t("settings.currencySubtitle")}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 460 }}>
          {CURRENCIES.map((c) => {
            const active = c.code === selectedCode;
            return (
              <Pressable key={c.code} onPress={() => onSelect(c.code)}>
                <View style={[styles.currRow, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "10" : colors.background, borderRadius: colors.radius }]}>
                  <View style={[styles.currSymbol, { backgroundColor: active ? colors.primary : colors.muted }]}>
                    <Text style={{ color: active ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>{c.symbol}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{c.name}</Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 }}>{c.code}</Text>
                  </View>
                  {active ? <Feather name="check" size={18} color={colors.primary} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function AppearancePicker({ visible, onClose, selectedTheme, onSelect }: { visible: boolean; onClose: () => void; selectedTheme: string; onSelect: (mode: any) => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const modes = [
    { id: "system", label: "System Default", icon: "smartphone" },
    { id: "light", label: "Light Mode", icon: "sun" },
    { id: "dark", label: "Dark Mode", icon: "moon" },
  ];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{t("settings.appearance")}</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>{t("settings.appearanceSubtitle")}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <View style={{ gap: 8 }}>
          {modes.map((m) => {
            const active = m.id === selectedTheme;
            return (
              <Pressable key={m.id} onPress={() => onSelect(m.id)}>
                <View style={[styles.currRow, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "10" : colors.background, borderRadius: colors.radius }]}>
                  <View style={[styles.currSymbol, { backgroundColor: active ? colors.primary : colors.muted }]}>
                    <Feather name={m.icon as any} size={18} color={active ? colors.primaryForeground : colors.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{m.label}</Text>
                  </View>
                  {active ? <Feather name="check" size={18} color={colors.primary} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function SignOutModal({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sheetHandle} />
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger + "1A", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Feather name="log-out" size={28} color={colors.danger} />
          </View>
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center" }]}>{t("settings.signOut")}</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
            {t("settings.signOutBody")}
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <Pressable onPress={onConfirm} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.danger, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{t("settings.yesSignOut")}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{t("settings.cancel")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sheetHandle} />
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger + "1A", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Feather name="trash-2" size={28} color={colors.danger} />
          </View>
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center" }]}>{t("settings.deleteAccountTitle")}</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 32, lineHeight: 20 }}>
            {t("settings.deleteAccountBody")}
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={onConfirm}
            disabled={loading}
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.danger, opacity: loading ? 0.6 : pressed ? 0.8 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{t("settings.yesDeleteAccount")}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={onClose}
            disabled={loading}
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{t("settings.cancel")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{title.toUpperCase()}</Text>
      <View style={{ gap: 8, marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Row({ icon, label, hint, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; hint?: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={[styles.rowIcon, { backgroundColor: colors.primary + "1A" }]}>
          <Feather name={icon} size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{label}</Text>
          {hint ? <Text style={[styles.rowHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{hint}</Text> : null}
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

function ToggleRow({ icon, label, value, onValueChange }: { icon: keyof typeof Feather.glyphMap; label: string; value: boolean; onValueChange: (val: boolean) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primary + "1A" }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold", flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 18 },
  groupTitle: { fontSize: 11, letterSpacing: 0.6, paddingHorizontal: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14 },
  rowHint: { fontSize: 12, marginTop: 2 },
  version: { textAlign: "center", marginTop: 32, fontSize: 12 },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 8, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.15)", alignSelf: "center", marginBottom: 12 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 4 },
  sheetTitle: { fontSize: 18, letterSpacing: -0.3 },
  currRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1.5, marginBottom: 8 },
  currSymbol: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionBtn: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  // Premium banner
  premiumBanner: {
    borderRadius: 20,
    padding: 18,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  premiumGlowA: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  premiumGlowB: {
    position: "absolute",
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(168,85,247,0.3)",
  },
  premiumLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  premiumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  premiumCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginLeft: 10,
  },
});
