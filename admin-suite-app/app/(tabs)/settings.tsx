import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { apiService, BASE_URL } from "@/services/api";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuth();
  const { employees, clients } = useData();

  // Profile Edit State
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editLocation, setEditLocation] = useState(user?.location || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editBio, setEditBio] = useState(user?.bio || "");
  const [editSocialLink, setEditSocialLink] = useState(user?.social_link || "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Export Data State
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");
  const [exportType, setExportType] = useState<"general" | "client" | "employee" | "financials">("general");
  const [exportTimeFilter, setExportTimeFilter] = useState("all");
  const [exportSelectedId, setExportSelectedId] = useState<string>("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");

  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const tabBarPad = (Platform.OS === "web" ? 84 : 80) + 24;

  const handleUpdateProfile = async () => {
    setEditError("");
    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append("first_name", editName.split(" ")[0] || editName);
      formData.append("location", editLocation.trim());
      formData.append("phone", editPhone.trim());
      formData.append("bio", editBio.trim());
      formData.append("social_link", editSocialLink.trim());

      const res = await apiService.updateMe(formData);
      if (user) {
        setUser({
          ...user,
          ...res.data,
          name: editName.trim() || user.name,
          initials: (editName.trim() || user.name || "US").slice(0, 2).toUpperCase(),
        });
      }
      setEditOpen(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || "Failed to update profile.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleTriggerExport = async () => {
    setExportError("");
    setExportLoading(true);
    try {
      if (Platform.OS === "web") {
        const token = await SecureStore.getItemAsync("admin-suite.token");
        const cleanBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
        const url = `${cleanBase}api/export/?format=${exportFormat}&type=${exportType}&time_filter=${exportTimeFilter}&id=${exportSelectedId}`;
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`Export failed: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `adminsuite_${exportType}_export.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        
        setExportOpen(false);
        setExportLoading(false);
        return;
      }

      const token = await SecureStore.getItemAsync("admin-suite.token");
      const cleanBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
      const filename = `adminsuite_${exportType}_export.${exportFormat}`;
      const downloadUrl = `${cleanBase}api/export/?format=${exportFormat}&type=${exportType}&time_filter=${exportTimeFilter}&id=${exportSelectedId}`;
      const localFileUri = FileSystem.documentDirectory + filename;

      const result = await FileSystem.downloadAsync(downloadUrl, localFileUri, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (result.status === 200) {
        setExportOpen(false);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: exportFormat === "pdf" ? "application/pdf" : "text/csv",
            dialogTitle: `Export Admin ${exportType.toUpperCase()} Data`,
            UTI: exportFormat === "pdf" ? "com.adobe.pdf" : "public.comma-separated-values-text",
          });
        } else {
          Alert.alert("Success", "File downloaded successfully but sharing is not supported on this device.");
        }
      } else {
        throw new Error("Failed to download file from server. Status: " + result.status);
      }
    } catch (err: any) {
      console.error("Export failed:", err);
      setExportError(err.message || "Failed to export data.");
      Alert.alert("Export Error", err.message || "Could not complete report generation.");
    } finally {
      setExportLoading(false);
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
            Profile
          </Text>

          <View style={styles.profileCard}>
            <LinearGradient
              colors={["#000000", "#1e3a8a", "#4f46e5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.profileHeaderRow}>
              <View style={[styles.avatarWrap, { backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }]}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" }}>
                    {user?.initials || "US"}
                  </Text>
                )}
              </View>
              <Pressable
                style={[styles.editBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
                onPress={() => {
                  setEditName(user?.name || "");
                  setEditLocation(user?.location || "");
                  setEditPhone(user?.phone || "");
                  setEditBio(user?.bio || "");
                  setEditSocialLink(user?.social_link || "");
                  setEditError("");
                  setEditOpen(true);
                }}
              >
                <Feather name="edit-2" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Edit</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={[styles.profileName, { fontFamily: "Inter_700Bold" }]}>
                {user?.name ?? "Admin"}
              </Text>
              <View style={styles.profileChip}>
                <Feather name="shield" size={11} color="#fff" />
                <Text style={[styles.chipText, { fontFamily: "Inter_600SemiBold" }]}>
                  {(user?.role ?? "admin").toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.contactWrap}>
              <View style={styles.contactRow}>
                <Feather name="mail" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={[styles.contactText, { fontFamily: "Inter_500Medium" }]}>
                  {user?.email || "No email provided"}
                </Text>
              </View>
            </View>
          </View>

          {/* Personal Details Card */}
          <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Feather name="user" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Personal Details</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.detailGrid}>
              <DetailRow label="Location" value={user?.location || "Not set"} icon="map-pin" />
              <DetailRow label="Phone" value={user?.phone || "Not set"} icon="phone" />
              <DetailRow label="Bio" value={user?.bio || "Not set"} icon="file-text" />
              <DetailRow label="Social Link" value={user?.social_link || "Not set"} icon="globe" isLink />
            </View>
          </View>

          <Group title="Workspace">
            <Row
              icon="briefcase"
              label="Organisation Details"
              hint="View & edit business information"
              onPress={() => router.push("/settings/organisation" as any)}
            />
            <Row
              icon="globe"
              label="All clients"
              hint={`${clients.length} companies`}
              onPress={() => router.push("/clients")}
            />
            <Row icon="sliders" label="Custom fields" hint="Manage extras" onPress={() => Alert.alert("Custom fields settings coming soon!")} />
            <Row icon="users" label="Team & roles" hint="Admin only" onPress={() => router.push("/employees")} />
            <Row icon="download" label="Export data" hint="CSV / PDF" onPress={() => { setExportError(""); setExportOpen(true); }} />
          </Group>

          <Group title="System">
            <Row
              icon="settings"
              label="App Settings"
              hint="Preferences & Account"
              onPress={() => router.push("/settings" as any)}
            />
            <Row
              icon="log-out"
              label="Log Out"
              hint="Sign out of your account"
              onPress={() => setSignOutOpen(true)}
            />
          </Group>

        </View>
      </ScrollView>

      {/* ─── Edit Profile Modal ─── */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <Pressable style={modalStyles.backdrop} onPress={() => setEditOpen(false)}>
          <Pressable style={[modalStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <View style={modalStyles.header}>
              <View style={modalStyles.headerLeft}>
                <View style={[modalStyles.headerIconWrap, { backgroundColor: colors.primary + "1A" }]}>
                  <Feather name="user" size={18} color={colors.primary} />
                </View>
                <Text style={[modalStyles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>
              </View>
              <Pressable onPress={() => setEditOpen(false)} style={[modalStyles.closeBtn, { backgroundColor: colors.muted }]}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14, paddingVertical: 8 }}>
                <ModalInput label="Full Name" value={editName} onChangeText={setEditName} icon="user" colors={colors} />
                <ModalInput label="Location" value={editLocation} onChangeText={setEditLocation} icon="map-pin" colors={colors} />
                <ModalInput label="Phone" value={editPhone} onChangeText={setEditPhone} icon="phone" colors={colors} keyboardType="phone-pad" />
                <ModalInput label="Bio" value={editBio} onChangeText={setEditBio} icon="file-text" colors={colors} multiline />
                <ModalInput label="Social Link" value={editSocialLink} onChangeText={setEditSocialLink} icon="link" colors={colors} />
              </View>
            </ScrollView>

            {editError ? (
              <View style={[modalStyles.errorBanner, { backgroundColor: "#ef44441A" }]}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 }}>{editError}</Text>
              </View>
            ) : null}

            <View style={modalStyles.footer}>
              <Pressable style={[modalStyles.cancelBtn, { borderColor: colors.border }]} onPress={() => setEditOpen(false)}>
                <Text style={[modalStyles.cancelText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[modalStyles.saveBtn, { backgroundColor: colors.primary, opacity: editLoading ? 0.6 : 1 }]}
                onPress={handleUpdateProfile}
                disabled={editLoading}
              >
                {editLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={modalStyles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Export Data Modal ─── */}
      <Modal visible={exportOpen} transparent animationType="fade" onRequestClose={() => setExportOpen(false)}>
        <Pressable style={modalStyles.backdrop} onPress={() => setExportOpen(false)}>
          <Pressable style={[modalStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <View style={modalStyles.header}>
              <View style={modalStyles.headerLeft}>
                <View style={[modalStyles.headerIconWrap, { backgroundColor: "#10b9811A" }]}>
                  <Feather name="download" size={18} color="#10b981" />
                </View>
                <Text style={[modalStyles.headerTitle, { color: colors.foreground }]}>Export Data</Text>
              </View>
              <Pressable onPress={() => setExportOpen(false)} style={[modalStyles.closeBtn, { backgroundColor: colors.muted }]}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 18, paddingVertical: 4 }}>
                {/* Format */}
                <View>
                  <Text style={[modalStyles.sectionLabel, { color: colors.mutedForeground }]}>FORMAT</Text>
                  <View style={modalStyles.chipRow}>
                    {(["pdf", "csv"] as const).map((f) => (
                      <Pressable
                        key={f}
                        style={[
                          modalStyles.chip,
                          { borderColor: exportFormat === f ? colors.primary : colors.border, backgroundColor: exportFormat === f ? colors.primary + "1A" : "transparent" },
                        ]}
                        onPress={() => setExportFormat(f)}
                      >
                        <Feather name={f === "pdf" ? "file-text" : "file"} size={14} color={exportFormat === f ? colors.primary : colors.mutedForeground} />
                        <Text style={{ color: exportFormat === f ? colors.primary : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{f.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Type */}
                <View>
                  <Text style={[modalStyles.sectionLabel, { color: colors.mutedForeground }]}>DATA TYPE</Text>
                  <View style={modalStyles.chipRow}>
                    {(["general", "client", "employee", "financials"] as const).map((t) => (
                      <Pressable
                        key={t}
                        style={[
                          modalStyles.chip,
                          { borderColor: exportType === t ? colors.primary : colors.border, backgroundColor: exportType === t ? colors.primary + "1A" : "transparent" },
                        ]}
                        onPress={() => setExportType(t)}
                      >
                        <Text style={{ color: exportType === t ? colors.primary : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13, textTransform: "capitalize" }}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Time filter */}
                <View>
                  <Text style={[modalStyles.sectionLabel, { color: colors.mutedForeground }]}>TIME RANGE</Text>
                  <View style={[modalStyles.chipRow, { flexWrap: "wrap" }]}>
                    {[
                      { key: "all", label: "All time" },
                      { key: "24h", label: "24 Hrs" },
                      { key: "3d", label: "3 Days" },
                      { key: "1w", label: "1 Week" },
                      { key: "1m", label: "1 Month" },
                      { key: "3m", label: "3 Months" },
                      { key: "6m", label: "6 Months" },
                      { key: "12m", label: "12 Months" },
                    ].map(({ key, label }) => (
                      <Pressable
                        key={key}
                        style={[
                          modalStyles.chip,
                          { borderColor: exportTimeFilter === key ? colors.primary : colors.border, backgroundColor: exportTimeFilter === key ? colors.primary + "1A" : "transparent" },
                        ]}
                        onPress={() => setExportTimeFilter(key)}
                      >
                        <Text style={{ color: exportTimeFilter === key ? colors.primary : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 12 }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            {exportError ? (
              <View style={[modalStyles.errorBanner, { backgroundColor: "#ef44441A" }]}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 }}>{exportError}</Text>
              </View>
            ) : null}

            <View style={modalStyles.footer}>
              <Pressable style={[modalStyles.cancelBtn, { borderColor: colors.border }]} onPress={() => setExportOpen(false)}>
                <Text style={[modalStyles.cancelText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[modalStyles.saveBtn, { backgroundColor: "#10b981", opacity: exportLoading ? 0.6 : 1 }]}
                onPress={handleTriggerExport}
                disabled={exportLoading}
              >
                {exportLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Feather name="download" size={16} color="#fff" />
                    <Text style={modalStyles.saveBtnText}>Download</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Sign Out Modal ─── */}
      <Modal visible={signOutOpen} transparent animationType="fade" onRequestClose={() => setSignOutOpen(false)}>
        <Pressable style={modalStyles.backdrop} onPress={() => setSignOutOpen(false)}>
          <Pressable style={[modalStyles.container, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: 360 }]} onPress={() => {}}>
            <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: "#ef44441A",
                alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <Feather name="log-out" size={28} color="#ef4444" />
              </View>
              <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 }}>Sign Out?</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 12 }}>
                You will be logged out of your account and need to sign in again to access your workspace.
              </Text>
            </View>

            <View style={[modalStyles.footer, { marginTop: 20, gap: 10 }]}>
              <Pressable
                style={[modalStyles.cancelBtn, { borderColor: colors.border, flex: 1 }]}
                onPress={() => setSignOutOpen(false)}
              >
                <Text style={[modalStyles.cancelText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[modalStyles.saveBtn, { backgroundColor: "#ef4444", flex: 1, opacity: signOutLoading ? 0.6 : 1 }]}
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
                    <Text style={modalStyles.saveBtnText}>Sign Out</Text>
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

/* ─── Reusable Modal Input Component ─── */
function ModalInput({ label, value, onChangeText, icon, colors, multiline, keyboardType }: {
  label: string; value: string; onChangeText: (t: string) => void;
  icon: keyof typeof Feather.glyphMap; colors: any;
  multiline?: boolean; keyboardType?: any;
}) {
  return (
    <View>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</Text>
      <View style={{
        flexDirection: "row", alignItems: multiline ? "flex-start" : "center",
        backgroundColor: colors.muted, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 12, paddingVertical: multiline ? 12 : 0,
        minHeight: multiline ? 80 : 48,
      }}>
        <Feather name={icon} size={16} color={colors.mutedForeground} style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={{
            flex: 1, color: colors.foreground, fontSize: 14,
            fontFamily: "Inter_500Medium",
            ...(multiline ? { textAlignVertical: "top", minHeight: 56 } : { height: 48 }),
          }}
          placeholderTextColor={colors.mutedForeground + "80"}
          placeholder={`Enter ${label.toLowerCase()}`}
          multiline={multiline}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

function DetailRow({ label, value, icon, isLink }: { label: string; value: string; icon: keyof typeof Feather.glyphMap; isLink?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconCol}>
        <Feather name={icon} size={14} color={colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{label}</Text>
        <Text
          numberOfLines={2}
          style={[
            styles.detailValue,
            {
              color: isLink && value !== "Not set" ? colors.accent : colors.foreground,
              textDecorationLine: isLink && value !== "Not set" ? "underline" : "none",
              fontFamily: "Inter_600SemiBold",
            },
          ]}
        >
          {value}
        </Text>
      </View>
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

const styles = StyleSheet.create({
  title: { fontSize: 28, letterSpacing: -0.5 },
  profileCard: {
    marginTop: 18,
    padding: 24,
    borderRadius: 24,
    overflow: "hidden",
  },
  profileHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileName: { color: "#fff", fontSize: 24, letterSpacing: -0.5 },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  chipText: { color: "#fff", fontSize: 10, letterSpacing: 0.4 },
  bioText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
  },
  contactWrap: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    gap: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    color: "#fff",
    fontSize: 13,
  },
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
  detailsCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(100, 116, 139, 0.12)",
    marginBottom: 12,
  },
  detailGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  detailIconCol: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(100, 116, 139, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 18,
  },
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
