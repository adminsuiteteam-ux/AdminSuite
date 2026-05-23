import { Feather } from "@expo/vector-icons";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { CURRENCIES, useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

export default function AppSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const {
    currency,
    setCurrency,
    theme,
    setTheme,
    biometricsEnabled,
    setBiometricsEnabled,
  } = useSettings();
  const [notif, setNotif] = useState(true);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

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
          Settings
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Group title="Preferences">
          <Row
            icon="dollar-sign"
            label="Currency"
            hint={`${currency.symbol}  ${currency.code} · ${currency.name}`}
            onPress={() => setCurrencyOpen(true)}
          />
          <ToggleRow
            icon="bell"
            label="Push notifications"
            value={notif}
            onValueChange={setNotif}
          />
          <ToggleRow
            icon="lock"
            label="Biometric login"
            value={biometricsEnabled}
            onValueChange={handleToggleBiometrics}
          />
          <Row icon="moon" label="Appearance" hint={theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"} onPress={() => setAppearanceOpen(true)} />
        </Group>

        <Group title="Account">
          <Row icon="help-circle" label="Help & support" onPress={() => router.push("/settings/help" as any)} />
          <Row icon="file-text" label="Privacy policy" onPress={() => router.push("/settings/privacy" as any)} />
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
                Sign out
              </Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>
        </Group>

        <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Admin Suite · v1.0.0
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
    </View>
  );
}

function CurrencyPicker({ visible, onClose, selectedCode, onSelect }: { visible: boolean; onClose: () => void; selectedCode: string; onSelect: (code: string) => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Choose currency</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>Applied across the entire app</Text>
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
                    <Text style={{ color: active ? "#fff" : colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>{c.symbol}</Text>
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
            <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Appearance</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>Choose your app theme</Text>
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
                    <Feather name={m.icon as any} size={18} color={active ? "#fff" : colors.foreground} />
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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sheetHandle} />
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.danger + "1A", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Feather name="log-out" size={28} color={colors.danger} />
          </View>
          <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center" }]}>Sign Out</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
            You'll need to sign in again to access your account and manage your company.
          </Text>
        </View>
        <View style={{ gap: 12 }}>
          <Pressable onPress={onConfirm} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.danger, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Yes, Sign Out</Text>
          </Pressable>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Cancel</Text>
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
});
