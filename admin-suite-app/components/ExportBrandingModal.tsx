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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getActiveBaseUrl } from "@/services/api";

interface ExportBrandingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ExportBrandingModal({ visible, onClose }: ExportBrandingModalProps) {
  const colors = useColors();
  const { user } = useAuth();

  // Export parameters
  const [exportType, setExportType] = useState<"general" | "client" | "employee" | "financials">("general");
  const [exportTimeFilter, setExportTimeFilter] = useState("all");
  const [exportSelectedId] = useState<string>("");

  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");

  // Reset temporary state when modal opens
  useEffect(() => {
    if (!visible) return;
    setExportError("");
    setExportLoading(false);
  }, [visible]);

  const handleTriggerExport = async () => {
    setExportError("");
    setExportLoading(true);

    try {
      const token = await SecureStore.getItemAsync("admin-suite.token");
      const base = getActiveBaseUrl();
      const cleanApiBase = base.endsWith("/") ? `${base}api/` : `${base}/api/`;
      const filename = `adminsuite_${exportType}_report.pdf`;
      const idParam = exportSelectedId ? `&id=${encodeURIComponent(exportSelectedId)}` : "";
      const hasBranding = !!(user?.business_name && user?.company_logo);
      const downloadUrl = `${cleanApiBase}export/?export_format=pdf&type=${exportType}&time_filter=${exportTimeFilter}${idParam}&skip_branding=${!hasBranding}`;

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

        if (Platform.OS === "android") {
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
                dialogTitle: `Export Admin ${exportType.toUpperCase()} Report`,
                UTI: "com.adobe.pdf",
              });
            } else {
              Alert.alert("Success", "PDF report downloaded successfully.");
            }
          }
        } else {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(result.uri, {
              mimeType: "application/pdf",
              dialogTitle: `Export Admin ${exportType.toUpperCase()} Report`,
              UTI: "com.adobe.pdf",
            });
          } else {
            Alert.alert("Success", "PDF report downloaded successfully.");
          }
        }
      } else {
        throw new Error(`Failed to download report from server. Status: ${result.status}`);
      }
    } catch (err: any) {
      console.error("Export failed:", err);
      setExportError(err.message || "Failed to export PDF report.");
      Alert.alert("Export Error", err.message || "Could not complete report generation.");
    } finally {
      setExportLoading(false);
    }
  };

  const renderContent = () => {
    return (
      <View>
        <View style={modalStyles.header}>
          <View style={modalStyles.headerLeft}>
            <View style={[modalStyles.headerIconWrap, { backgroundColor: "#10b9811A" }]}>
              <Feather name="download" size={18} color="#10b981" />
            </View>
            <Text style={[modalStyles.headerTitle, { color: colors.foreground }]}>Export Report</Text>
          </View>
          <Pressable onPress={onClose} style={[modalStyles.closeBtn, { backgroundColor: colors.muted }]}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 18, paddingVertical: 4 }}>
            {/* FORMAT (LOCKED TO PDF) */}
            <View>
              <Text style={[modalStyles.sectionLabel, { color: colors.mutedForeground }]}>FORMAT</Text>
              <View style={[modalStyles.chip, { borderColor: colors.primary, backgroundColor: colors.primary + "1A", alignSelf: "flex-start" }]}>
                <Feather name="file-text" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  PDF Document
                </Text>
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

            {/* BRANDING NOTICE */}
            {user?.business_name && user?.company_logo ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 }}>
                <Feather name="check-circle" size={13} color="#10b981" />
                <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                  Export branded with {user.business_name} logo
                </Text>
              </View>
            ) : null}
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
                <Text style={modalStyles.saveBtnText}>Download PDF</Text>
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
