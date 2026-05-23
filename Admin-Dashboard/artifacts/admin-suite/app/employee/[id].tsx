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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatInView } from "@/components/FloatInView";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { employees } from "@/data/mockData";
import { useColors } from "@/hooks/useColors";

const STATUS_COLOR = {
  active: "#22c55e",
  on_leave: "#f97316",
  terminated: "#ef4444",
};

const SOCIAL_DEFS = [
  { key: "whatsapp", icon: "message-circle", color: "#25D366", url: (v) => `https://wa.me/${v.replace(/\D/g, "")}` },
  { key: "facebook", icon: "facebook", color: "#1877F2", url: (v) => `https://facebook.com/${v}` },
  { key: "instagram", icon: "instagram", color: "#E4405F", url: (v) => `https://instagram.com/${v.replace("@", "")}` },
  { key: "twitter", icon: "twitter", color: "#1DA1F2", url: (v) => `https://twitter.com/${v.replace("@", "")}` },
];

export default function EmployeeDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { id } = useLocalSearchParams();
  const employee = employees.find((e) => e.id === id);
  const [moreOpen, setMoreOpen] = useState(false);

  if (!employee) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.foreground }}>Employee not found</Text>
      </View>
    );
  }

  const open = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  const onAction = (label) => {
    if (Platform.OS === "web") return;
    Alert.alert(label, `${label} action triggered for ${employee.name}.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.heroBg,
          { paddingTop: insets.top + 12 },
        ]}
      >
        <LinearGradient
          colors={["#000000", "#0a0a0a", "#0f172a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bgGlowA} />
        <View style={styles.bgGlowB} />
        <View style={styles.topRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={10}
          >
            <Feather name="chevron-left" size={22} color="#fff" />
          </Pressable>
          <Text style={[styles.topTitle, { fontFamily: "Inter_600SemiBold" }]}>
            Profile
          </Text>
          <Pressable
            onPress={() => onAction("Edit")}
            style={styles.iconBtn}
            hitSlop={10}
          >
            <Feather name="edit-2" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 140,
          marginTop: -64,
        }}
        showsVerticalScrollIndicator={false}
      >
        <FloatInView>
          <View style={styles.heroCard}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: employee.avatar }} style={styles.avatar} />
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLOR[employee.status] || "#64748b" },
                ]}
              />
            </View>
            <Text
              style={[
                styles.heroName,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              {employee.name}
            </Text>
            <Text
              style={[
                styles.heroRole,
                { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
              ]}
            >
              {employee.role} · {employee.department}
            </Text>

            <View style={styles.statRow}>
              <StatBox
                label="Paid"
                value={fmt(employee.salary)}
                icon="dollar-sign"
                color={colors.foreground}
              />
              <View style={styles.divider} />
              <StatBox
                label="Office"
                value={employee.office}
                icon="briefcase"
                color={colors.foreground}
              />
              <View style={styles.divider} />
              <StatBox
                label="Rating"
                value={"★".repeat(employee.performance)}
                icon="award"
                color={colors.foreground}
              />
            </View>
          </View>
        </FloatInView>

        <FloatInView delay={120}>
          <Section title="Quick contact">
            <View style={styles.socialRow}>
              <SocialChip
                icon="phone"
                color="#0ea5e9"
                label="Call"
                onPress={() => open(`tel:${employee.phone}`)}
              />
              <SocialChip
                icon="mail"
                color="#a855f7"
                label="Email"
                onPress={() => open(`mailto:${employee.email}`)}
              />
              {SOCIAL_DEFS.map((s) => {
                const handle = employee.socials?.[s.key];
                if (!handle) return null;
                return (
                  <SocialChip
                    key={s.key}
                    icon={s.icon}
                    color={s.color}
                    label={s.key === "whatsapp" ? "WhatsApp" : capitalize(s.key)}
                    onPress={() => open(s.url(handle))}
                  />
                );
              })}
            </View>
          </Section>
        </FloatInView>

        <FloatInView delay={180}>
          <Section title="Short bio">
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
                {employee.bio}
              </Text>
            </View>
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
              <DetailRow icon="map-pin" label="Location" value={employee.location} />
              <DetailRow icon="mail" label="Email" value={employee.email} />
              <DetailRow icon="phone" label="Phone" value={employee.phone} />
              <DetailRow
                icon="hash"
                label="Status"
                value={employee.status.replace("_", " ")}
                last
              />
            </View>
          </Section>
        </FloatInView>

        <FloatInView delay={300}>
          <Section title="Manage">
            <View style={styles.manageGrid}>
              <ManageBtn
                icon="flag"
                color="#f97316"
                label="Flag"
                onPress={() => onAction("Flag")}
              />
              <ManageBtn
                icon="alert-circle"
                color="#eab308"
                label="Query"
                onPress={() => onAction("Query")}
              />
              <ManageBtn
                icon="check-square"
                color="#22c55e"
                label="Give task"
                onPress={() => onAction("Give task")}
              />
              <ManageBtn
                icon="edit-3"
                color="#2563eb"
                label="Edit"
                onPress={() => onAction("Edit")}
              />
              <ManageBtn
                icon="trash-2"
                color="#ef4444"
                label="Delete"
                onPress={() => onAction("Delete")}
              />
              <ManageBtn
                icon="more-horizontal"
                color="#64748b"
                label="More"
                onPress={() => setMoreOpen((v) => !v)}
              />
            </View>
            {moreOpen ? (
              <View
                style={[
                  styles.moreCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <MoreRow icon="award" label="Promote" onPress={() => onAction("Promote")} />
                <MoreRow icon="dollar-sign" label="Adjust salary" onPress={() => onAction("Adjust salary")} />
                <MoreRow icon="calendar" label="Schedule leave" onPress={() => onAction("Schedule leave")} />
                <MoreRow icon="send" label="Send message" onPress={() => onAction("Send message")} />
                <MoreRow icon="archive" label="Archive" onPress={() => onAction("Archive")} last />
              </View>
            ) : null}
          </Section>
        </FloatInView>
      </ScrollView>
    </View>
  );
}

function capitalize(s) {
  return s[0].toUpperCase() + s.slice(1);
}

function Section({ title, children }) {
  const colors = useColors();
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
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

function StatBox({ label, value, icon, color }) {
  return (
    <View style={styles.statBox}>
      <Feather name={icon} size={14} color={color} style={{ opacity: 0.8 }} />
      <Text style={[styles.statValue, { color, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
    </View>
  );
}

function SocialChip({ icon, color, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialChip,
        { backgroundColor: color + "1A", opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.socialLabel, { color, fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({ icon, label, value, last }) {
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
          textTransform: "capitalize",
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function ManageBtn({ icon, color, label, onPress }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.manageBtn,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.manageIcon, { backgroundColor: color + "1A" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text
        style={{
          color: colors.foreground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MoreRow({ icon, label, onPress, last }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.moreRow,
          !last && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Feather name={icon} size={16} color={colors.foreground} />
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            flex: 1,
          }}
        >
          {label}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroBg: {
    paddingHorizontal: 16,
    paddingBottom: 90,
    overflow: "hidden",
  },
  bgGlowA: {
    position: "absolute",
    top: -40,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(37,99,235,0.3)",
  },
  bgGlowB: {
    position: "absolute",
    bottom: -80,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: "#fff", fontSize: 15 },
  heroCard: {
    marginHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 22,
    alignItems: "center",
    marginTop: 0,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 4,
    backgroundColor: "#fff",
    marginTop: -64,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  statusBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: "#fff",
  },
  heroName: {
    fontSize: 22,
    letterSpacing: -0.5,
    marginTop: 12,
  },
  heroRole: { fontSize: 13, marginTop: 4 },
  statRow: {
    flexDirection: "row",
    marginTop: 18,
    width: "100%",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
  },
  statValue: { fontSize: 13, letterSpacing: -0.2 },
  statLabel: {
    color: "#94a3b8",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  divider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignSelf: "stretch",
    marginVertical: 4,
  },
  socialRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  socialChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  socialLabel: { fontSize: 12 },
  bioCard: { padding: 16, borderWidth: 1 },
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
});
