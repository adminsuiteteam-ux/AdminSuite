import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import Svg, { Circle, Path } from "react-native-svg";

import { FloatInView } from "@/components/FloatInView";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";

const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e",
  pending: "#f97316",
  completed: "#2563eb",
};



export default function ClientDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { clients, refresh } = useData();
  const { id } = useLocalSearchParams();
  const client = clients.find((c: any) => String(c.id) === String(id));

  const [actionsOpen, setActionsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!client) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.foreground }}>Client not found</Text>
      </View>
    );
  }

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  const handleDeleteClient = () => {
    Alert.alert(
      "Delete Client",
      `Are you sure you want to permanently delete ${client.company}? All associated projects will also be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await apiService.deleteClient(client.id);
              await refresh();
              setActionsOpen(false);
              router.back();
            } catch (err) {
              console.error("Delete client failed:", err);
              Alert.alert("Error", "Failed to delete client. Please try again.");
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
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
              Client
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

          <FloatInView>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["#000000", "#0a0a0a", "#0f172a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.glow1} />
              <View style={styles.glow2} />

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: STATUS_COLOR[client.status] + "33" },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: STATUS_COLOR[client.status] },
                  ]}
                />
                <Text
                  style={{
                    color: STATUS_COLOR[client.status],
                    fontFamily: "Inter_700Bold",
                    fontSize: 10,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  {client.status}
                </Text>
              </View>

              <Text style={[styles.heroName, { fontFamily: "Inter_700Bold" }]}>
                {client.company}
              </Text>
              <Text style={[styles.heroContact, { fontFamily: "Inter_500Medium" }]}>
                {client.contact}
              </Text>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}>
                    {fmt(client.paid)}
                  </Text>
                  <Text style={[styles.heroStatLabel, { fontFamily: "Inter_500Medium" }]}>
                    Paid
                  </Text>
                </View>
                <View style={styles.vline} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}>
                    {client.projects?.length ?? 0}
                  </Text>
                  <Text style={[styles.heroStatLabel, { fontFamily: "Inter_500Medium" }]}>
                    Projects
                  </Text>
                </View>
              </View>
            </View>
          </FloatInView>

          <FloatInView delay={120}>
            <Section title="Quick actions">
              <View style={styles.actionRow}>
                <ActionChip
                  icon="mail"
                  label="Email"
                  color="#2563eb"
                  onPress={() => open(`mailto:${client.email}`)}
                />
                {client.website ? (
                  <ActionChip
                    icon="globe"
                    label="Website"
                    color="#22c55e"
                    onPress={() => open(client.website)}
                  />
                ) : null}
                <ActionChip
                  icon="navigation"
                  label="Directions"
                  color="#f97316"
                  onPress={() =>
                    client.coords?.lat && open(
                      `https://www.google.com/maps/search/?api=1&query=${client.coords.lat},${client.coords.lng}`,
                    )
                  }
                />
              </View>
            </Section>
          </FloatInView>

          <FloatInView delay={180}>
            <Section title="Live location">
              <Pressable
                onPress={() =>
                  open(
                    `https://www.google.com/maps/search/?api=1&query=${client.coords.lat},${client.coords.lng}`,
                  )
                }
              >
                <View
                  style={[
                    styles.mapCard,
                    { borderRadius: colors.radius, borderColor: colors.border },
                  ]}
                >
                  <LinearGradient
                    colors={["#0f172a", "#1e293b", "#0a0a0a"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <MapBackdrop />
                  {client.coords?.lat ? (
                    <>
                      <View style={styles.mapPinWrap}>
                        <View style={styles.mapPinPulse} />
                        <View style={styles.mapPin}>
                          <Feather name="map-pin" size={18} color="#fff" />
                        </View>
                      </View>
                      <View style={styles.mapMeta}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.mapLoc, { fontFamily: "Inter_700Bold" }]}>
                            {client.location}
                          </Text>
                          <Text style={[styles.mapCoord, { fontFamily: "Inter_500Medium", fontVariant: ["tabular-nums"] }]}>
                            {client.coords.lat.toFixed(4)}°, {client.coords.lng.toFixed(4)}°
                          </Text>
                        </View>
                        <View style={styles.mapCta}>
                          <Text
                            style={{
                              color: "#fff",
                              fontFamily: "Inter_600SemiBold",
                              fontSize: 11,
                            }}
                          >
                            Open
                          </Text>
                          <Feather name="external-link" size={12} color="#fff" />
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Inter_500Medium" }}>No location data</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </Section>
          </FloatInView>

          <FloatInView delay={240}>
            <Section title="Details">
              <View
                style={[
                  styles.detailCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <DetailRow icon="mail" label="Email" value={client.email} />
                <DetailRow icon="globe" label="Website" value={client.website || "—"} />
                <DetailRow
                  icon="map-pin"
                  label="Location"
                  value={client.location}
                />
                <DetailRow
                  icon="dollar-sign"
                  label="Lifetime paid"
                  value={fmt(client.paid)}
                  last
                />
              </View>
            </Section>
          </FloatInView>

          <FloatInView delay={300}>
            <Section title="Description">
              <View
                style={[
                  styles.bioCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  {client.description}
                </Text>
              </View>
            </Section>
          </FloatInView>

          <FloatInView delay={360}>
            <Section title="Remark">
              <View
                style={[
                  styles.bioCard,
                  styles.remarkCard,
                  {
                    backgroundColor: colors.warning + "1A",
                    borderColor: colors.warning + "33",
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Feather name="bookmark" size={16} color={colors.warning} />
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    lineHeight: 20,
                    flex: 1,
                  }}
                >
                  {client.remark}
                </Text>
              </View>
            </Section>
          </FloatInView>

          <FloatInView delay={390}>
            <Section title="Client Projects">
              <View style={{ gap: 10 }}>
                {client.projects && client.projects.length > 0 ? (
                  client.projects.map((p: any) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push(`/project/${p.id}` as any)}
                    >
                      {({ pressed }) => (
                        <View
                          style={{
                            padding: 14,
                            borderWidth: 1,
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            borderRadius: colors.radius,
                            opacity: pressed ? 0.85 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                            gap: 10
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              backgroundColor: (p.status === "completed" ? "#22c55e" : p.status === "active" ? "#2563eb" : "#94a3b8") + "1A",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <Feather name="layers" size={14} color={p.status === "completed" ? "#22c55e" : p.status === "active" ? "#2563eb" : "#64748b"} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                                {p.name}
                              </Text>
                              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 }}>
                                {p.start_date || "No start date"} → {p.end_date || "No end date"} · {p.location || "On-site / remote"}
                              </Text>
                            </View>
                            <View style={{
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: (p.status === "completed" ? "#22c55e" : p.status === "active" ? "#2563eb" : "#64748b") + "1A"
                            }}>
                              <Text style={{
                                color: p.status === "completed" ? "#22c55e" : p.status === "active" ? "#2563eb" : "#64748b",
                                fontFamily: "Inter_700Bold",
                                fontSize: 9,
                                textTransform: "uppercase"
                              }}>
                                {p.status}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={{ height: 6, flex: 1, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" }}>
                              <View style={{ height: "100%", width: `${p.progress}%`, backgroundColor: p.status === "completed" ? "#22c55e" : p.status === "active" ? "#2563eb" : "#64748b" }} />
                            </View>
                            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                              {p.progress}%
                            </Text>
                          </View>
                        </View>
                      )}
                    </Pressable>
                  ))
                ) : (
                  <View style={{ padding: 20, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                      No projects associated with this client
                    </Text>
                  </View>
                )}
              </View>
            </Section>
          </FloatInView>

          <FloatInView delay={420}>
            <Section title="Financial record & Tasks">
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <DetailRow icon="dollar-sign" label="Lifetime Value" value={fmt(Number(client.lifetime_value || 0))} />
                <DetailRow icon="clock" label="Pending Payments" value={fmt(Number(client.pending_payments || 0))} />
                {Number(client.client_owes_company || 0) > 0 && (
                  <DetailRow icon="alert-circle" label="Client Owes Us" value={fmt(Number(client.client_owes_company))} />
                )}
                {Number(client.company_owes_client || 0) > 0 && (
                  <DetailRow icon="alert-triangle" label="We Owe Client" value={fmt(Number(client.company_owes_client))} />
                )}
                <DetailRow icon="check-square" label="Projects Count" value={String(client.projects?.length || 0)} />
                <DetailRow icon="loader" label="Active Projects" value={String(client.projects?.filter((p:any)=>p.status==='active').length || 0)} last />
              </View>
            </Section>
          </FloatInView>


        </View>
      </ScrollView>

      {/* Actions Modal */}
      <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActionsOpen(false)}>
          <View style={[styles.modalContainer, { backgroundColor: colors.isDark ? "#18181c" : "#ffffff", borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Client Actions</Text>
            
            <Pressable
              onPress={() => {
                setActionsOpen(false);
                router.push(`/client/create?editId=${client.id}`);
              }}
              style={({ pressed }) => [styles.modalActionRow, pressed && { backgroundColor: colors.muted }]}
            >
              <Feather name="edit-2" size={16} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Edit Client Profile</Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteClient}
              style={({ pressed }) => [styles.modalActionRow, pressed && { backgroundColor: colors.muted }]}
              disabled={isDeleting}
            >
              <Feather name="trash-2" size={16} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                {isDeleting ? "Deleting..." : "Delete Client"}
              </Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />

            <Pressable
              onPress={() => setActionsOpen(false)}
              style={({ pressed }) => [styles.modalActionRow, { justifyContent: "center" }, pressed && { backgroundColor: colors.muted }]}
            >
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MapBackdrop() {
  return (
    <Svg
      style={{ ...StyleSheet.absoluteFillObject, opacity: 0.18 }}
      viewBox="0 0 300 160"
    >
      <Path
        d="M0,80 Q40,40 80,70 T160,60 T240,90 T300,70"
        stroke="#60a5fa"
        strokeWidth="1.5"
        fill="none"
      />
      <Path
        d="M0,120 Q60,90 120,110 T240,130 T300,110"
        stroke="#a78bfa"
        strokeWidth="1.2"
        fill="none"
      />
      <Path
        d="M40,0 L60,160"
        stroke="#fff"
        strokeWidth="0.5"
        opacity="0.3"
      />
      <Path
        d="M180,0 L200,160"
        stroke="#fff"
        strokeWidth="0.5"
        opacity="0.3"
      />
      <Circle cx="80" cy="60" r="2" fill="#22c55e" />
      <Circle cx="200" cy="100" r="2" fill="#f97316" />
    </Svg>
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

function ActionChip({ icon, label, color, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionChip,
        {
          backgroundColor: color + "1A",
          transform: [{ scale: pressed ? 0.94 : 1 }],
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Feather name={icon} size={16} color={color} />
      <Text
        style={{
          color,
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({ icon, label, value, last }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; last?: boolean }) {
  const colors = useColors();
  return (
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
          color: colors.foreground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 13,
          fontVariant: ["tabular-nums"],
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
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
  glow1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(37,99,235,0.25)",
  },
  glow2: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(249,115,22,0.15)",
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
  heroContact: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 4,
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
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  mapCard: {
    height: 160,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  mapPinWrap: {
    position: "absolute",
    top: 50,
    left: "50%",
    marginLeft: -22,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPinPulse: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(37,99,235,0.4)",
  },
  mapPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  mapMeta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  mapLoc: { color: "#fff", fontSize: 14 },
  mapCoord: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginTop: 2,
  },
  mapCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(37,99,235,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
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
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bioCard: { padding: 16, borderWidth: 1 },
  remarkCard: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
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
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
