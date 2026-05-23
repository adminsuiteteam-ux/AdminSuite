import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatInView } from "@/components/FloatInView";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { getMediaUrl } from "@/services/api";

const STATUS_COLOR: Record<string, string> = {
  active: "#22c55e",
  on_leave: "#f97316",
  terminated: "#ef4444",
};

const PRIMARY_SOCIALS = [
  { key: "whatsapp", icon: "message-circle", color: "#25D366", url: (v: string) => `https://wa.me/${v.replace(/\D/g, "")}` },
  { key: "facebook", icon: "facebook", color: "#1877F2", url: (v: string) => `https://facebook.com/${v}` },
  { key: "phone", icon: "phone", color: "#0ea5e9", url: (v: string) => `tel:${v}` },
  { key: "instagram", icon: "instagram", color: "#E4405F", url: (v: string) => `https://instagram.com/${v.replace("@", "")}` },
];

const EXTRA_SOCIALS = [
  { key: "linkedin", icon: "linkedin", color: "#0A66C2", url: (v: string) => `https://linkedin.com/in/${v}` },
  { key: "discord", icon: "message-square", color: "#5865F2", url: (v: string) => `https://discord.com/users/${v}` },
  { key: "twitter", icon: "twitter", color: "#1DA1F2", url: (v: string) => `https://twitter.com/${v.replace("@", "")}` },
];

const MOCK_DOCS = [
  { id: "cv", name: "Curriculum Vitae", icon: "file-text", date: "2024-01-15" },
  { id: "app_letter", name: "Application Letter", icon: "file", date: "2024-01-10" },
  { id: "hire_letter", name: "Hiring Letter", icon: "award", date: "2024-02-01" },
];

export default function EmployeeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { employees } = useData();
  const { id } = useLocalSearchParams();
  const [refresh, setRefresh] = useState(0);
  const employee = employees.find((e: any) => String(e.id) === String(id));
  const [moreOpen, setMoreOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setRefresh((r) => r + 1);
    }, [])
  );

  if (!employee) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.foreground }}>Employee not found</Text>
      </View>
    );
  }

  const fin = employee.finance || {
    currentPay: 0,
    employeeOwesCompany: 0,
    companyOwesEmployee: 0,
    shares: 0,
    bonuses: 0,
    deductions: 0
  };
  const statusLabel = employee.status === "on_leave" ? "ON LEAVE" : employee.status === "terminated" ? "INACTIVE" : employee.status.toUpperCase();

  const open = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const onEdit = () => {
    router.push(`/employee/create?editId=${employee.id}` as any);
  };

  const onAction = (label: string) => {
    if (Platform.OS === "web") return;
    Alert.alert(label, `${label} action triggered for ${employee.name}.`);
  };

  const socialButtons: { icon: string; color: string; onPress: () => void }[] = [];
  PRIMARY_SOCIALS.forEach((s) => {
    if (s.key === "phone") {
      socialButtons.push({ icon: s.icon, color: s.color, onPress: () => open(`tel:${employee.phone}`) });
    } else {
      const handle = (employee.socials as any)?.[s.key];
      if (handle) socialButtons.push({ icon: s.icon, color: s.color, onPress: () => open(s.url(handle)) });
    }
  });
  EXTRA_SOCIALS.forEach((s) => {
    const handle = (employee.socials as any)?.[s.key];
    if (handle) socialButtons.push({ icon: s.icon, color: s.color, onPress: () => open(s.url(handle)) });
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140, paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page title ────────────────────────────────── */}
        <View style={styles.pageTitleRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="chevron-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Profile
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ══════════════════════════════════════════════════
            PROFILE CARD — dark gradient, matching screenshot
           ══════════════════════════════════════════════════ */}
        <FloatInView>
          <View style={styles.profileCard}>
            <LinearGradient
              colors={["#0a0f1e", "#111d42", "#3b28cc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
            />

            {/* Top row: Avatar + Edit button */}
            <View style={styles.cardTopRow}>
              <View style={styles.avatarRing}>
                <Image source={{ uri: getMediaUrl(employee.avatar) }} style={styles.avatar} />
              </View>
              <Pressable
                onPress={onEdit}
                style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="edit-2" size={14} color="#fff" />
                <Text style={[styles.editText, { fontFamily: "Inter_600SemiBold" }]}>Edit</Text>
              </Pressable>
            </View>

            {/* Name */}
            <Text style={[styles.cardName, { fontFamily: "Inter_700Bold" }]}>
              {employee.name}
            </Text>

            {/* Role chip */}
            <View style={styles.roleChip}>
              <Feather name="shield" size={12} color="#fff" />
              <Text style={[styles.roleChipText, { fontFamily: "Inter_600SemiBold" }]}>
                {employee.role.toUpperCase()}
              </Text>
            </View>

            {/* Bio */}
            <Text style={[styles.cardBio, { fontFamily: "Inter_400Regular" }]}>
              {employee.bio}
            </Text>

            {/* Divider */}
            <View style={styles.cardDivider} />

            {/* Contact rows */}
            <View style={styles.contactRow}>
              <Feather name="mail" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.contactText, { fontFamily: "Inter_500Medium" }]}>{employee.email}</Text>
            </View>
            <View style={styles.contactRow}>
              <Feather name="phone" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.contactText, { fontFamily: "Inter_500Medium" }]}>{employee.phone}</Text>
            </View>
            <View style={styles.contactRow}>
              <Feather name="map-pin" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.contactText, { fontFamily: "Inter_500Medium" }]}>{employee.location}</Text>
            </View>
          </View>
        </FloatInView>

        {/* ── Quick contact ─────────────────────────────── */}
        <FloatInView delay={120}>
          <Section title="Quick contact">
            <View style={styles.socialRow}>
              {socialButtons.map((btn, idx) => (
                <SocialIconBtn
                  key={idx}
                  icon={btn.icon as keyof typeof Feather.glyphMap}
                  color={btn.color}
                  onPress={btn.onPress}
                />
              ))}
            </View>
          </Section>
        </FloatInView>

        {/* ── Stats row ─────────────────────────────────── */}
        <FloatInView delay={180}>
          <Section title="Overview">
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Feather name="dollar-sign" size={16} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{fmt(employee.salary)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>SALARY</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Feather name="briefcase" size={16} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>{employee.office}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>OFFICE</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Feather name="star" size={16} color="#f59e0b" />
                <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{"★".repeat(employee.performance)}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>RATING</Text>
              </View>
            </View>
          </Section>
        </FloatInView>

        {/* ── Manage ────────────────────────────────────── */}
        <FloatInView delay={240}>
          <Section title="Manage">
            <View style={styles.manageGrid}>
              <ManageBtn icon="flag" color="#f97316" label="Flag" onPress={() => onAction("Flag")} />
              <ManageBtn icon="alert-circle" color="#eab308" label="Query" onPress={() => onAction("Query")} />
              <ManageBtn icon="check-square" color="#22c55e" label="Give task" onPress={() => onAction("Give task")} />
              <ManageBtn icon="edit-3" color="#2563eb" label="Edit" onPress={onEdit} />
              <ManageBtn icon="trash-2" color="#ef4444" label="Delete" onPress={() => onAction("Delete")} />
              <ManageBtn icon="more-horizontal" color="#64748b" label="More" onPress={() => setMoreOpen((v) => !v)} />
            </View>
            {moreOpen && (
              <View style={[styles.moreCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <MoreRow icon="award" label="Promote" onPress={() => onAction("Promote")} />
                <MoreRow icon="dollar-sign" label="Adjust salary" onPress={() => onAction("Adjust salary")} />
                <MoreRow icon="calendar" label="Schedule leave" onPress={() => onAction("Schedule leave")} />
                <MoreRow icon="send" label="Send message" onPress={() => onAction("Send message")} />
                <MoreRow icon="archive" label="Archive" onPress={() => onAction("Archive")} last />
              </View>
            )}
          </Section>
        </FloatInView>

        {/* ── Financial summary ─────────────────────────── */}
        <FloatInView delay={300}>
          <Section title="Financial record">
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <DetailRow icon="dollar-sign" label="Current pay" value={fmt(fin.currentPay)} />
              {fin.employeeOwesCompany > 0 && (
                <DetailRow icon="alert-circle" label="Employee owes company" value={fmt(fin.employeeOwesCompany)} valueColor="#ef4444" />
              )}
              {fin.companyOwesEmployee > 0 && (
                <DetailRow icon="alert-triangle" label="Company owes employee" value={fmt(fin.companyOwesEmployee)} valueColor="#22c55e" />
              )}
              <DetailRow icon="bar-chart-2" label="Company shares" value={fin.shares > 0 ? `${fin.shares}%` : "None"} />
              <DetailRow icon="gift" label="Bonuses" value={fmt(fin.bonuses)} />
              <DetailRow icon="minus-circle" label="Deductions" value={fmt(fin.deductions)} last />
            </View>
            <Pressable
              onPress={() => router.push(`/employee/finance?id=${employee.id}` as any)}
              style={({ pressed }) => [
                styles.financeLink,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="file-text" size={16} color={colors.accent} />
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 }}>View full financial record</Text>
              <Feather name="chevron-right" size={16} color={colors.accent} />
            </Pressable>
          </Section>
        </FloatInView>

        {/* ── Documents ─────────────────────────────────── */}
        <FloatInView delay={360}>
          <Section title="Documents">
            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {MOCK_DOCS.map((doc, i) => (
                <Pressable key={doc.id} onPress={() => onAction(`View ${doc.name}`)}>
                  <View style={[styles.detailRow, i < MOCK_DOCS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <View style={[styles.detailIcon, { backgroundColor: colors.muted }]}>
                      <Feather name={doc.icon as any} size={14} color={colors.foreground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{doc.name}</Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>Added {doc.date}</Text>
                    </View>
                    <Feather name="download" size={16} color={colors.mutedForeground} />
                  </View>
                </Pressable>
              ))}
            </View>
          </Section>
        </FloatInView>
      </ScrollView>
    </View>
  );
}

/* ── Helper components ──────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10, paddingHorizontal: 4 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function SocialIconBtn({ icon, color, onPress }: { icon: keyof typeof Feather.glyphMap; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.socialIconBtn, { backgroundColor: color + "1A", opacity: pressed ? 0.7 : 1 }]}>
      <Feather name={icon} size={18} color={color} />
    </Pressable>
  );
}

function DetailRow({ icon, label, value, last, valueColor }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; last?: boolean; valueColor?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.detailRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={[styles.detailIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={14} color={colors.foreground} />
      </View>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: valueColor || colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, textTransform: "capitalize" }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ManageBtn({ icon, color, label, onPress }: { icon: keyof typeof Feather.glyphMap; color: string; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.manageBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.manageIcon, { backgroundColor: color + "1A" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

function MoreRow({ icon, label, onPress, last }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; last?: boolean }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.moreRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
        <Feather name={icon} size={16} color={colors.foreground} />
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 }}>{label}</Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  pageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  pageTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
    flex: 1,
  },

  /* ── Profile card ─────────────────────────────────── */
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  editText: {
    color: "#fff",
    fontSize: 13,
  },
  cardName: {
    color: "#fff",
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: 18,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  roleChipText: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 0.6,
  },
  cardBio: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 20,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  contactText: {
    color: "#fff",
    fontSize: 14,
  },

  /* ── Social ───────────────────────────────────────── */
  socialRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  socialIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Stats ────────────────────────────────────────── */
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: { fontSize: 13, letterSpacing: -0.2 },
  statLabel: { fontSize: 9, letterSpacing: 0.5 },

  /* ── Detail cards ─────────────────────────────────── */
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

  /* ── Manage ───────────────────────────────────────── */
  manageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  manageBtn: {
    width: "31%",
    paddingVertical: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  manageIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  moreCard: { borderWidth: 1, paddingHorizontal: 14, marginTop: 12 },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  financeLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    marginTop: 10,
  },
});
