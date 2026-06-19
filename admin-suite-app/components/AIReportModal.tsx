import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { aiService } from "@/services/aiService";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PERIODS = [
  { key: "Current Month", label: "Current Month" },
  { key: "Last Month", label: "Last Month" },
  { key: "Year to Date", label: "Year to Date" },
];

export function AIReportModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const [period, setPeriod] = useState("Current Month");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setReport(null);
    try {
      const res = await aiService.generateReport(period);
      if (res.data && res.data.report) {
        setReport(res.data.report);
        setBusinessName(res.data.business_name || "");
      } else {
        Alert.alert("Error", "No report data returned from AI service.");
      }
    } catch (err: any) {
      console.error("Failed to generate AI report:", err);
      const errMsg = err.response?.data?.error || "AI service is temporarily unavailable.";
      Alert.alert("Report Generation Failed", errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    try {
      await Share.share({
        title: `${businessName} AI Business Report - ${period}`,
        message: report,
      });
    } catch (err: any) {
      Alert.alert("Error", "Could not open system share sheet.");
    }
  };

  const handleExportFile = async () => {
    if (!report) return;
    const filename = `AI_Business_Report_${period.replace(/\s+/g, "_")}.txt`;

    try {
      if (Platform.OS === "web") {
        const blob = new Blob([report], { type: "text/plain" });
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        return;
      }

      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, report);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: `Export AI Business Report`,
        });
      } else {
        Alert.alert("Export Success", `Report saved successfully to device files.`);
      }
    } catch (err: any) {
      Alert.alert("Export Error", "Failed to export report file.");
    }
  };

  const handleClose = () => {
    setReport(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="cpu" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>{t('aiReport.title')}</Text>
            </View>
            <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Form / Scroll view */}
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {!report && !loading && (
              <View style={styles.form}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  {t('aiReport.selectPeriod')}
                </Text>
                <View style={styles.periodRow}>
                  {PERIODS.map((p) => {
                    const active = period === p.key;
                    return (
                      <Pressable
                        key={p.key}
                        onPress={() => setPeriod(p.key)}
                        style={[
                          styles.periodChip,
                          {
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? colors.primary + "15" : colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.periodText,
                            {
                              color: active ? colors.primary : colors.foreground,
                              fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                            },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
                  {t('aiReport.helpText')}
                </Text>
              </View>
            )}

            {loading && (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>
                  {t('aiReport.analyzing')}
                </Text>
              </View>
            )}

            {report && !loading && (
              <View style={[styles.reportContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.reportTitle, { color: colors.foreground }]}>
                  {businessName || "Executive Summary"} ({period})
                </Text>
                <Text style={[styles.reportTextBody, { color: colors.foreground }]}>
                  {report}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {!report ? (
              <Pressable
                disabled={loading}
                onPress={handleGenerate}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.6 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={styles.primaryBtnText}>{t('aiReport.generate')}</Text>
              </Pressable>
            ) : (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    {
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Feather name="share-2" size={14} color={colors.foreground} />
                  <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>{t('aiReport.share')}</Text>
                </Pressable>

                <Pressable
                  onPress={handleExportFile}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.primary,
                      flex: 1,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Feather name="download" size={14} color="#fff" />
                  <Text style={styles.primaryBtnText}>{t('aiReport.export')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  container: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    marginVertical: 8,
  },
  form: {
    gap: 12,
    paddingVertical: 10,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  periodText: {
    fontSize: 13,
  },
  helpText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 8,
  },
  loader: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 16,
  },
  loaderText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  reportContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  reportTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  reportTextBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 24,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
