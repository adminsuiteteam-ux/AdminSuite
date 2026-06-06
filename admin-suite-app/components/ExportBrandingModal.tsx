import React, { useState, useEffect } from "react";
import {
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as SecureStore from "@/services/storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { router } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";
import apiClient from "@/services/api";

interface ExportBrandingModalProps {
  visible: boolean;
  onClose: () => void;
}

// Module-level cache for 5-minute profile validity check
let profileCheckCache: {
  timestamp: number;
  isValid: boolean;
} | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ExportBrandingModal({ visible, onClose }: ExportBrandingModalProps) {
  const colors = useColors();
  const { user, setUser } = useAuth();

  // Dialog stage: "warning" | "options"
  const [stage, setStage] = useState<"warning" | "options">("options");
  const [checking, setChecking] = useState(false);

  // Export parameters
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");
  const [exportType, setExportType] = useState<"general" | "client" | "employee" | "financials">("general");
  const [exportTimeFilter, setExportTimeFilter] = useState("all");
  const [exportSelectedId, setExportSelectedId] = useState<string>("");
  const [skipBranding, setSkipBranding] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");

  // When visibility opens, check profile status and determine the initial stage
  useEffect(() => {
    if (!visible) return;

    // Reset temporary states
    setExportError("");
    setStage("options");

    const checkProfileStatus = async () => {
      setChecking(true);
      const now = Date.now();
      let isValid = !!(user?.business_name && user?.company_logo);

      // Check cache first
      if (profileCheckCache && (now - profileCheckCache.timestamp) < CACHE_DURATION) {
        isValid = profileCheckCache.isValid;
      } else {
        try {
          const res = await apiService.getMe();
          const refreshedUser = res.data;
          if (refreshedUser) {
            setUser(refreshedUser);
            isValid = !!(refreshedUser.business_name && refreshedUser.company_logo);
          }
        } catch (err) {
          console.warn("Failed to check profile status on export, using existing context:", err);
        }
        profileCheckCache = { timestamp: now, isValid };
      }

      setSkipBranding(!isValid);
      if (isValid) {
        setStage("options");
      } else {
        setStage("warning");
      }
      setChecking(false);
    };

    checkProfileStatus();
  }, [visible]);

  const handleTriggerExport = async () => {
    setExportError("");
    setExportLoading(true);

    try {
      const token = await SecureStore.getItemAsync("admin-suite.token");
      // Use apiClient.defaults.baseURL which is dynamically resolved to the
      // correct host by resolveBackendUrl() — avoids the stale compile-time IP.
      const resolvedApiBase = apiClient.defaults.baseURL ?? "http://localhost:8000/api/";
      const cleanApiBase = resolvedApiBase.endsWith("/") ? resolvedApiBase : `${resolvedApiBase}/`;
      const filename = `adminsuite_${exportType}_export.${exportFormat}`;
      const downloadUrl = `${cleanApiBase}export/?format=${exportFormat}&type=${exportType}&time_filter=${exportTimeFilter}&id=${exportSelectedId}&skip_branding=${skipBranding}`;

      if (Platform.OS === "web") {
        const response = await fetch(downloadUrl, {
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
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

        setExportLoading(false);
        onClose();
        return;
      }

      const localFileUri = FileSystem.documentDirectory + filename;
      const result = await FileSystem.downloadAsync(downloadUrl, localFileUri, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (result.status === 200) {
        setExportLoading(false);
        onClose();

        if (Platform.OS === "android" && exportFormat === "pdf") {
          try {
            const contentUri = await FileSystem.getContentUriAsync(result.uri);
            await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
              data: contentUri,
              flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
              type: "application/pdf",
            });
          } catch (err: any) {
            console.error("Failed to launch intent viewer:", err);
            // Fallback to sharing
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(result.uri, {
                mimeType: "application/pdf",
                dialogTitle: `Export Admin ${exportType.toUpperCase()} Data`,
                UTI: "com.adobe.pdf",
              });
            } else {
              Alert.alert("Success", "File downloaded successfully.");
            }
          }
        } else {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(result.uri, {
              mimeType: exportFormat === "pdf" ? "application/pdf" : "text/csv",
              dialogTitle: `Export Admin ${exportType.toUpperCase()} Data`,
              UTI: exportFormat === "pdf" ? "com.adobe.pdf" : "public.comma-separated-values-text",
            });
          } else {
            Alert.alert("Success", "File downloaded successfully but sharing is not supported on this device.");
          }
        }
      } else {
        throw new Error(`Failed to download file from server. Status: ${result.status}`);
      }
    } catch (err: any) {
      console.error("Export failed:", err);
      setExportError(err.message || "Failed to export data.");
      Alert.alert("Export Error", err.message || "Could not complete report generation.");
    } finally {
      setExportLoading(false);
    }
  };

  const renderContent = () => {
    if (checking) {
      return (
        <View style={modalStyles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[modalStyles.loaderText, { color: colors.mutedForeground }]}>
            Verifying organization profile...
          </Text>
        </View>
      );
    }

    if (stage === "warning") {
      return (
        <View style={{ alignItems: "center" }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.primary + "1A",
            alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <Feather name="award" size={28} color={colors.primary} />
          </View>
          <Text style={{ color: colors.foreground, fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8, textAlign: "center" }}>
            Branding Incomplete
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 12 }}>
            Your organization profile is missing a name or logo. To export branded PDF reports, please complete your profile setup.
          </Text>

          <View style={{ marginTop: 24, gap: 10, width: "100%" }}>
            <Pressable
              style={({ pressed }) => [
                modalStyles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }
              ]}
              onPress={() => {
                onClose();
                router.push("/settings/organisation");
              }}
            >
              <Feather name="settings" size={16} color={colors.primaryForeground} />
              <Text style={[modalStyles.saveBtnText, { color: colors.primaryForeground }]}>Configure Branding</Text>
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [
                modalStyles.saveBtn,
                {
                  backgroundColor: colors.isDark ? "#2e2e33" : "#f1f5f9",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }
              ]}
              onPress={() => {
                setSkipBranding(true);
                setStage("options");
              }}
            >
              <Feather name="file-text" size={16} color={colors.foreground} />
              <Text style={[modalStyles.saveBtnText, { color: colors.foreground }]}>Export Standard (No Branding)</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                modalStyles.cancelBtn,
                {
                  borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }
              ]}
              onPress={onClose}
            >
              <Text style={[modalStyles.cancelText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View>
        <View style={modalStyles.header}>
          <View style={modalStyles.headerLeft}>
            <View style={[modalStyles.headerIconWrap, { backgroundColor: "#10b9811A" }]}>
              <Feather name="download" size={18} color="#10b981" />
            </View>
            <Text style={[modalStyles.headerTitle, { color: colors.foreground }]}>Export Data</Text>
          </View>
          <Pressable onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: colors.muted }]}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 18, paddingVertical: 4 }}>
            {/* FORMAT */}
            <View>
              <Text style={[modalStyles.sectionLabel, { color: colors.mutedForeground }]}>FORMAT</Text>
              <View style={modalStyles.chipRow}>
                {(["pdf", "csv"] as const).map((f) => (
                  <Pressable
                    key={f}
                    style={({ pressed }) => [
                      modalStyles.chip,
                      {
                        borderColor: exportFormat === f ? colors.primary : colors.border,
                        backgroundColor: exportFormat === f ? colors.primary + "1A" : "transparent",
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                    onPress={() => setExportFormat(f)}
                  >
                    <Feather
                      name={f === "pdf" ? "file-text" : "file"}
                      size={14}
                      color={exportFormat === f ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={{ color: exportFormat === f ? colors.primary : colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      {f.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* DATA TYPE */}
            <View>
              <Text style={[modalStyles.sectionLabel, { color: colors.mutedForeground }]}>DATA TYPE</Text>
              <View style={modalStyles.chipRow}>
                {(["general", "client", "employee", "financials"] as const).map((t) => (
                  <Pressable
                    key={t}
                    style={({ pressed }) => [
                      modalStyles.chip,
                      {
                        borderColor: exportType === t ? colors.primary : colors.border,
                        backgroundColor: exportType === t ? colors.primary + "1A" : "transparent",
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                    onPress={() => setExportType(t)}
                  >
                    <Text style={{ color: exportType === t ? colors.primary : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13, textTransform: "capitalize" }}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* TIME RANGE */}
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
                    style={({ pressed }) => [
                      modalStyles.chip,
                      {
                        borderColor: exportTimeFilter === key ? colors.primary : colors.border,
                        backgroundColor: exportTimeFilter === key ? colors.primary + "1A" : "transparent",
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                    onPress={() => setExportTimeFilter(key)}
                  >
                    <Text style={{ color: exportTimeFilter === key ? colors.primary : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                      {label}
                    </Text>
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
          <Pressable
            style={({ pressed }) => [
              modalStyles.cancelBtn,
              {
                borderColor: colors.border,
                flex: 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              }
            ]}
            onPress={onClose}
          >
            <Text style={[modalStyles.cancelText, { color: colors.foreground }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              modalStyles.saveBtn,
              {
                backgroundColor: "#10b981",
                flex: 1,
                opacity: exportLoading ? 0.6 : pressed ? 0.9 : 1,
                transform: [{ scale: pressed && !exportLoading ? 0.96 : 1 }],
              }
            ]}
            onPress={handleTriggerExport}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="download" size={16} color="#fff" />
                <Text style={modalStyles.saveBtnText}>Download</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[modalStyles.container, { backgroundColor: colors.isDark ? "#18181c" : "#ffffff", borderColor: colors.border }]}
          onPress={() => {}} // prevent click-through
        >
          {renderContent()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
  loaderContainer: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
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
