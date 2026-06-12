import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as SecureStore from "@/services/storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { apiService, BASE_URL, getMediaUrl } from "@/services/api";
import ExportBrandingModal from "@/components/ExportBrandingModal";

export default function MoreHubScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { clients, projects } = useData();
  const { t } = useTranslation();

  // Export Data State
  const [exportOpen, setExportOpen] = useState(false);

  // Sign Out State
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const tabBarPad = (Platform.OS === "web" ? 84 : 80) + 24;



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
          {t("settings.more")}
          </Text>

          {/* ─── Grid Menu (Projects & Profile) ─── */}
          <View style={styles.gridRow}>
            {/* Projects Card */}
            <Pressable
              onPress={() => router.push("/(tabs)/projects" as any)}
              style={({ pressed }) => [
                styles.gridCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={[styles.gridIconWrap, { backgroundColor: "#2563eb1A" }]}>
                <Feather name="layers" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.gridTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {t("settings.projects")}
                </Text>
                <Text style={[styles.gridDesc, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {projects.length} {t("settings.projects")}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>

            {/* Profile Card */}
            <Pressable
              onPress={() => router.push("/settings/profile" as any)}
              style={({ pressed }) => [
                styles.gridCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={[styles.gridIconWrap, { backgroundColor: "#8b5cf61A" }]}>
                {user?.avatar ? (
                  <Image source={{ uri: getMediaUrl(user.avatar) }} style={styles.avatarImg} />
                ) : (
                  <Text style={{ color: "#8b5cf6", fontSize: 14, fontFamily: "Inter_700Bold" }}>
                    {user?.initials || "US"}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.gridTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {t("settings.profile")}
                </Text>
                <Text style={[styles.gridDesc, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {t("settings.viewEditProfile")}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Workspace Settings */}
          <Group title={t("settings.workspace")}>
            <Row
              icon="briefcase"
              label={t("settings.orgDetails")}
              hint={t("settings.viewEditBusiness")}
              onPress={() => router.push("/settings/organisation" as any)}
            />

            <Row
              icon="globe"
              label={t("settings.allClients")}
              hint={`${clients.length} companies`}
              onPress={() => router.push("/clients")}
            />
            <Row icon="sliders" label={t("settings.customFields")} hint={t("settings.manageExtras")} onPress={() => Alert.alert("Custom fields settings coming soon!")} />
            <Row icon="users" label={t("settings.teamRoles")} hint={t("settings.adminOnly")} onPress={() => router.push("/employees")} />
            <Row icon="download" label={t("settings.exportData")} hint={t("settings.csvPdf")} onPress={() => setExportOpen(true)} />
          </Group>

          {/* System Settings */}
          <Group title={t("settings.system")}>
            <Row
              icon="settings"
              label={t("settings.appSettings")}
              hint={t("settings.preferencesAccount")}
              onPress={() => router.push("/settings" as any)}
            />
            <Row
              icon="log-out"
              label={t("settings.logOut")}
              hint={t("settings.signOutOfAccount")}
              onPress={() => setSignOutOpen(true)}
            />
          </Group>

        </View>
      </ScrollView>

      <ExportBrandingModal
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      {/* ─── Sign Out Opaque Modal ─── */}
      <Modal visible={signOutOpen} transparent animationType="fade" onRequestClose={() => setSignOutOpen(false)}>
        <Pressable style={modalStyles.backdrop} onPress={() => setSignOutOpen(false)}>
          <Pressable style={[modalStyles.container, { backgroundColor: colors.isDark ? "#18181c" : "#ffffff", borderColor: colors.border, maxWidth: 360 }]} onPress={() => {}}>
            <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: "#ef44441A",
                alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <Feather name="log-out" size={28} color="#ef4444" />
              </View>
              <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 }}>{t("settings.signOutTitle")}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 12 }}>
                {t("settings.signOutBody")}
              </Text>
            </View>

            <View style={[modalStyles.footer, { marginTop: 20, gap: 10 }]}>
              <Pressable
                style={({ pressed }) => [
                  modalStyles.cancelBtn,
                  {
                    borderColor: colors.border,
                    flex: 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  }
                ]}
                onPress={() => setSignOutOpen(false)}
              >
                <Text style={[modalStyles.cancelText, { color: colors.foreground }]}>{t("settings.cancel")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  modalStyles.saveBtn,
                  {
                    backgroundColor: "#ef4444",
                    flex: 1,
                    opacity: signOutLoading ? 0.6 : pressed ? 0.9 : 1,
                    transform: [{ scale: pressed && !signOutLoading ? 0.96 : 1 }],
                  }
                ]}
                onPress={async () => {
                  setSignOutLoading(true);
                  try {
                    await logout();
                    setSignOutOpen(false);
                    router.replace("/(auth)/login");
                  } catch (e) {
                    Alert.alert("Error", "Failed to sign out. Please try again.");
                  } finally {
                    setSignOutLoading(false);
                  }
                }}
                disabled={signOutLoading}
              >
                {signOutLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Feather name="log-out" size={16} color="#fff" />
                    <Text style={modalStyles.saveBtnText}>{t("settings.signOut")}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
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

function Row({ icon, label, hint, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; hint?: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            styles.row,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.9 : 1,
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
                    fontVariant: hint.includes("companies") || hint.includes("CSV") ? ["tabular-nums"] : undefined,
                  },
                ]}
              >
                {hint}
              </Text>
            ) : null}
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, letterSpacing: -0.5, marginBottom: 16 },
  gridRow: {
    gap: 12,
    marginBottom: 10,
  },
  gridCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderRadius: 20,
    gap: 12,
  },
  gridIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  gridTitle: { fontSize: 16, letterSpacing: -0.2 },
  gridDesc: { fontSize: 12, marginTop: 2 },
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
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
