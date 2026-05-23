import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { clients } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useSettings();
  const [notif, setNotif] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const tabBarPad = (Platform.OS === "web" ? 84 : 80) + 24;

  const onLogout = () => {
    if (Platform.OS === "web") {
      logout().then(() => router.replace("/(auth)/login"));
    } else {
      Alert.alert("Sign out", "You'll need to sign in again.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: tabBarPad,
          paddingTop: insets.top + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Settings
          </Text>

          <View style={styles.profileCard}>
            <LinearGradient
              colors={["#312e81", "#4f46e5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.avatar}>
              <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>
                {(user?.initials || "AD").slice(0, 2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { fontFamily: "Inter_700Bold" }]}>
                {user?.name ?? "Admin"}
              </Text>
              <Text
                style={[styles.profileEmail, { fontFamily: "Inter_500Medium" }]}
              >
                {user?.email ?? "admin@adminsuite.app"}
              </Text>
              <View style={styles.profileChip}>
                <Feather name="shield" size={11} color="#fff" />
                <Text style={[styles.chipText, { fontFamily: "Inter_600SemiBold" }]}>
                  {(user?.role ?? "admin").toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <Group title="Workspace">
            <Row
              icon="dollar-sign"
              label="Currency"
              hint={`${currency.symbol}  ${currency.code} · ${currency.name}`}
              onPress={() => setCurrencyOpen(true)}
            />
            <Row
              icon="briefcase"
              label="All clients"
              hint={`${clients.length} companies`}
            />
            <Row icon="sliders" label="Custom fields" hint="Manage extras" />
            <Row icon="users" label="Team & roles" hint="Admin only" />
            <Row icon="download" label="Export data" hint="CSV / PDF" />
          </Group>

          <Group title="Preferences">
            <ToggleRow
              icon="bell"
              label="Push notifications"
              value={notif}
              onValueChange={setNotif}
            />
            <ToggleRow
              icon="lock"
              label="Biometric login"
              value={biometrics}
              onValueChange={setBiometrics}
            />
            <Row icon="moon" label="Appearance" hint="System" />
          </Group>

          <Group title="Account">
            <Row icon="help-circle" label="Help & support" />
            <Row icon="file-text" label="Privacy policy" />
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
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: colors.danger + "1A" },
                  ]}
                >
                  <Feather name="log-out" size={16} color={colors.danger} />
                </View>
                <Text
                  style={{
                    color: colors.danger,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    flex: 1,
                  }}
                >
                  Sign out
                </Text>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={colors.mutedForeground}
                />
              </View>
            </Pressable>
          </Group>

          <Text
            style={[
              styles.version,
              {
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
              },
            ]}
          >
            Admin Suite · v1.0.0
          </Text>
        </View>
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
    </View>
  );
}

function CurrencyPicker({ visible, onClose, selectedCode, onSelect }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View
        style={[
          styles.modalSheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text
              style={[
                styles.sheetTitle,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              Choose currency
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Applied across the entire app
            </Text>
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
                <View
                  style={[
                    styles.currRow,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? colors.primary + "10"
                        : colors.background,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.currSymbol,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.muted,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 16,
                      }}
                    >
                      {c.symbol}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                      }}
                    >
                      {c.name}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {c.code}
                    </Text>
                  </View>
                  {active ? (
                    <Feather name="check" size={18} color={colors.primary} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Group({ title, children }) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={[
          styles.groupTitle,
          { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      <View style={{ gap: 8, marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Row({ icon, label, hint, onPress }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
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
        <View
          style={[
            styles.rowIcon,
            { backgroundColor: colors.primary + "1A" },
          ]}
        >
          <Feather name={icon} size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.rowLabel,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {label}
          </Text>
          {hint ? (
            <Text
              style={[
                styles.rowHint,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              {hint}
            </Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

function ToggleRow({ icon, label, value, onValueChange }) {
  const colors = useColors();
  return (
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
      <View
        style={[styles.rowIcon, { backgroundColor: colors.primary + "1A" }]}
      >
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text
        style={[
          styles.rowLabel,
          { color: colors.foreground, fontFamily: "Inter_600SemiBold", flex: 1 },
        ]}
      >
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, letterSpacing: -0.5 },
  profileCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20 },
  profileName: { color: "#fff", fontSize: 18, letterSpacing: -0.3 },
  profileEmail: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  chipText: { color: "#fff", fontSize: 10, letterSpacing: 0.4 },
  groupTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 14 },
  rowHint: { fontSize: 12, marginTop: 2 },
  version: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 12,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sheetTitle: { fontSize: 18, letterSpacing: -0.3 },
  currRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  currSymbol: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
