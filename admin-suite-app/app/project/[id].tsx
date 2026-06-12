import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatInView } from "@/components/FloatInView";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { getMediaUrl, apiService } from "@/services/api";
import { useTranslation } from "react-i18next";

const STATUS_COLORS: Record<string, string> = {
  active: "#2563eb",
  planned: "#0ea5e9",
  on_hold: "#f59e0b",
  completed: "#22c55e",
};

// Safe accessor: validates the status key against an allowlist before lookup.
const ALLOWED_PROJECT_STATUSES = ["active", "planned", "on_hold", "completed"] as const;
type ProjectStatus = (typeof ALLOWED_PROJECT_STATUSES)[number];
function getProjectStatusColor(status: string, fallback: string): string {
  const key = ALLOWED_PROJECT_STATUSES.includes(status as ProjectStatus)
    ? (status as ProjectStatus)
    : null;
  return key ? STATUS_COLORS[key] : fallback;
}

export default function ProjectDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { projects, clients, refresh } = useData();
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();

  const [actionsOpen, setActionsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const project = projects.find((p: any) => String(p.id) === String(id));
  const client = project ? clients.find((c: any) => c.id === project.client) : null;

  if (!project) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.foreground }}>{t("project.notFound")}</Text>
      </View>
    );
  }

  const handleDeleteProject = () => {
    Alert.alert(
      t("project.actions"),
      t("project.deleteConfirm", { name: project.name }),
      [
        { text: t("project.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await apiService.deleteProject(project.id);
              await refresh();
              setActionsOpen(false);
              router.back();
            } catch (err) {
              console.error("Delete project failed:", err);
              Alert.alert(t("common.error"), t("project.deleteFailed"));
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const statusColor = getProjectStatusColor(project.status, colors.mutedForeground);

  const openMaps = () => {
    if (project.location) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.location)}`).catch(() => {});
    }
  };

  const openContact = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 140,
          paddingTop: insets.top + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16 }}>
          {/* Header Row */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              hitSlop={10}
            >
              <Feather name="chevron-left" size={22} color={colors.foreground} />
            </Pressable>
            <Text
              style={[
                styles.topTitle,
                { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {t("project.details")}
            </Text>
            <Pressable
              onPress={() => setActionsOpen(true)}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              hitSlop={10}
            >
              <Feather name="more-horizontal" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Project Main Hero Card */}
          <FloatInView>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["#000000", "#0a0a0a", "#1e1e24"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.glow, { backgroundColor: statusColor + "25" }]} />

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusColor + "22" },
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text
                  style={{
                    color: statusColor,
                    fontFamily: "Inter_700Bold",
                    fontSize: 10,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  {project.status.replace("_", " ")}
                </Text>
              </View>

              <Text style={[styles.heroName, { fontFamily: "Inter_700Bold" }]}>
                {project.name}
              </Text>

              {client ? (
                <Pressable
                  onPress={() => router.push(`/client/${client.id}` as any)}
                  style={({ pressed }) => [
                    styles.clientLinkRow,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <Text style={[styles.heroContact, { fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" }]}>
                    Client: {project.client_name}
                  </Text>
                  <Feather name="external-link" size={12} color="rgba(255,255,255,0.6)" />
                </Pressable>
              ) : (
                <Text style={[styles.heroContact, { fontFamily: "Inter_500Medium" }]}>
                  Client: {project.client_name}
                </Text>
              )}

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { fontFamily: "Inter_700Bold" }]}>
                    {fmt(project.value)}
                  </Text>
                  <Text style={[styles.heroStatLabel, { fontFamily: "Inter_500Medium" }]}>
                    {t("project.contractValue")}
                  </Text>
                </View>
                <View style={styles.vline} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { fontFamily: "Inter_700Bold" }]}>
                    {project.progress}%
                  </Text>
                  <Text style={[styles.heroStatLabel, { fontFamily: "Inter_500Medium" }]}>
                    {t("project.completed")}
                  </Text>
                </View>
              </View>
            </View>
          </FloatInView>

          {/* Progress Section */}
          <FloatInView delay={120}>
            <Section title={t("project.progressTracker")}>
              <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={styles.progressHeaderRow}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    {t("project.milestoneProgress")}
                  </Text>
                  <Text style={{ color: statusColor, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                    {project.progress}%
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressBarFill, { width: `${project.progress}%`, backgroundColor: statusColor }]} />
                </View>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 8 }}>
                  {project.progress === 100
                    ? t("project.allDelivered")
                    : t("project.inProgress")}
                </Text>
              </View>
            </Section>
          </FloatInView>

          {/* Project Details */}
          <FloatInView delay={180}>
            <Section title={t("project.detailsTimeline")}>
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <DetailRow
                  icon="calendar"
                  label={t("project.startDate")}
                  value={project.start_date || t("profile.notSet")}
                />
                <DetailRow
                  icon="flag"
                  label={t("project.targetEndDate")}
                  value={project.end_date || t("profile.notSet")}
                />
                <DetailRow
                  icon="map-pin"
                  label={t("project.projectLocation")}
                  value={project.location || t("project.onSiteRemote")}
                  onPress={project.location ? openMaps : undefined}
                  isLink={!!project.location}
                />
                <DetailRow
                  icon="trending-up"
                  label={t("project.contractBudget")}
                  value={fmt(project.value)}
                  last
                />
              </View>
            </Section>
          </FloatInView>

          {/* Client Details & Quick Action */}
          {client && (
            <FloatInView delay={240}>
              <Section title={t("project.clientQuickContact")}>
                <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <DetailRow
                    icon="user"
                    label={t("project.primaryContact")}
                    value={client.contact}
                  />
                  <DetailRow
                    icon="mail"
                    label={t("project.emailAddress")}
                    value={client.email}
                    onPress={() => openContact(`mailto:${client.email}`)}
                    isLink
                  />
                  <DetailRow
                    icon="briefcase"
                    label={t("project.companyName")}
                    value={client.company}
                    onPress={() => router.push(`/client/${client.id}` as any)}
                    isLink
                    last
                  />
                </View>
              </Section>
            </FloatInView>
          )}

          {/* Project Media Showcase (Images & Videos) */}
          <FloatInView delay={300}>
            <Section title={t("project.projectMediaShowcase")}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {project.image ? (
                  <View style={[styles.mediaCard, { borderColor: colors.border }]}>
                    <Image source={{ uri: getMediaUrl(project.image) }} style={styles.mediaImg} />
                    <View style={styles.mediaLabelBg}>
                      <Text style={styles.mediaLabel}>{t("project.onSiteImage")}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.mediaCard, styles.mediaPlaceholder, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <Feather name="image" size={24} color={colors.mutedForeground} />
                    <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>{t("project.noImage")}</Text>
                  </View>
                )}

                {project.video ? (
                  <Pressable
                    onPress={() => openContact(getMediaUrl(project.video))}
                    style={({ pressed }) => [
                      styles.mediaCard,
                      { borderColor: colors.border, opacity: pressed ? 0.9 : 1 }
                    ]}
                  >
                    <View style={styles.videoOverlay}>
                      <Feather name="play-circle" size={40} color="#fff" />
                    </View>
                    <View style={styles.mediaLabelBg}>
                      <Text style={styles.mediaLabel}>{t("project.video")}</Text>
                    </View>
                  </Pressable>
                ) : (
                  <View style={[styles.mediaCard, styles.mediaPlaceholder, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <Feather name="video" size={24} color={colors.mutedForeground} />
                    <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>{t("project.noVideo")}</Text>
                  </View>
                )}
              </ScrollView>
            </Section>
          </FloatInView>

        </View>
      </ScrollView>

      {/* Actions Modal */}
      <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActionsOpen(false)}>
          <View style={[styles.modalContainer, { backgroundColor: colors.isDark ? "#18181c" : "#ffffff", borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{t("project.actions")}</Text>
            
            <Pressable
              onPress={() => {
                setActionsOpen(false);
                router.push(`/project/create?editId=${project.id}`);
              }}
              style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: colors.muted }]}
            >
              <Feather name="edit-2" size={16} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{t("project.editDetails")}</Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteProject}
              style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: colors.muted }]}
              disabled={isDeleting}
            >
              <Feather name="trash-2" size={16} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                {isDeleting ? t("project.deleting") : t("project.deleteProject")}
              </Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />

            <Pressable
              onPress={() => setActionsOpen(false)}
              style={({ pressed }) => [styles.actionRow, { justifyContent: "center" }, pressed && { backgroundColor: colors.muted }]}
            >
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{t("project.cancel")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginBottom: 10,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last,
  onPress,
  isLink
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  last?: boolean;
  onPress?: () => void;
  isLink?: boolean;
}) {
  const colors = useColors();
  const Content = (
    <View
      style={[
        styles.detailRow,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.detailIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={14} color={colors.foreground} />
      </View>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_500Medium",
          fontSize: 13,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: isLink ? colors.accent : colors.foreground,
          textDecorationLine: isLink ? "underline" : "none",
          fontFamily: "Inter_600SemiBold",
          fontSize: 13,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {Content}
      </Pressable>
    );
  }
  return Content;
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  topTitle: { fontSize: 15 },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    padding: 22,
    minHeight: 200,
  },
  glow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  heroName: {
    color: "#fff",
    fontSize: 26,
    letterSpacing: -0.6,
    marginTop: 12,
  },
  clientLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  heroContact: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
  heroStats: {
    flexDirection: "row",
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 12,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: "#fff", fontSize: 18, letterSpacing: -0.4 },
  heroStatLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
  },
  vline: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "stretch",
    marginVertical: 4,
  },
  progressCard: {
    padding: 16,
    borderWidth: 1,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  detailCard: { borderWidth: 1, paddingHorizontal: 14, overflow: "hidden" },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCard: {
    width: 200,
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  mediaImg: {
    width: "100%",
    height: "100%",
  },
  mediaPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  placeholderText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaLabelBg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  mediaLabel: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
