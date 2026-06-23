import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { FloatInView } from "@/components/FloatInView";
import { RingChart } from "@/components/RingChart";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { AIInsightCard } from "@/components/AIInsightCard";
import { aiService, AIClientInsightsResponse } from "@/services/aiService";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  pending: "#f97316",
  completed: "#2563eb",
};

// Safe accessor: validates key against known allowlist before indexing.
const ALLOWED_CLIENT_STATUSES = ["active", "pending", "completed"] as const;
type ClientStatus = (typeof ALLOWED_CLIENT_STATUSES)[number];
function getStatusColor(status: string): string {
  const key = ALLOWED_CLIENT_STATUSES.includes(status as ClientStatus)
    ? (status as ClientStatus)
    : null;
  return key ? STATUS_COLORS[key] : "#64748b";
}

export default function ClientsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { clients, clientMetrics: cm } = useData();
  const [filter, setFilter] = useState("all");
  const [clientInsights, setClientInsights] = useState<AIClientInsightsResponse | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  React.useEffect(() => {
    let active = true;
    aiService.getClientInsights()
      .then(res => {
        if (active && res.data) {
          setClientInsights(res.data);
        }
      })
      .catch(() => {
        // AI insights endpoint not available — fail silently
      })
      .finally(() => {
        if (active) {
          setInsightsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const cardData = useMemo(() => {
    if (!clientInsights) return null;
    const { insights, summary } = clientInsights;
    
    // Find urgent/at_risk insights
    const flagged = (insights || []).filter(i => i.health === 'urgent' || i.health === 'at_risk');
    
    let riskLevel: 'healthy' | 'at_risk' | 'urgent' = 'healthy';
    if ((insights || []).some(i => i.health === 'urgent')) {
      riskLevel = 'urgent';
    } else if ((insights || []).some(i => i.health === 'at_risk')) {
      riskLevel = 'at_risk';
    }

    const items = flagged.map(i => `${i.client_name}: ${i.reason} (Try: ${i.recommended_action})`);
    
    return {
      title: "Client Portfolio Health",
      summary,
      riskLevel,
      items: items.length > 0 ? items : ["All client relationships are tracking healthy."]
    };
  }, [clientInsights]);

  const filtered = useMemo(
    () => clients.filter((c: any) => filter === "all" || c.status === filter),
    [filter, clients],
  );

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;

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
          <FloatInView>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.title,
                    { color: colors.foreground, fontFamily: "Inter_700Bold" },
                  ]}
                >
                  {t("clients.title")}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {t("clients.subtitle")}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/client/create" as any)}
                style={({ pressed }) => [
                  {
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </FloatInView>

          <FloatInView delay={120}>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["#000000", "#0a0a0a", "#0f172a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroGlowB} />
              <View style={styles.heroGlowA} />

              <View style={styles.heroLeft}>
                <Text style={[styles.heroLabel, { fontFamily: "Inter_600SemiBold" }]}>
                  {t("clients.total")}
                </Text>
                <Text style={[styles.heroNum, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}>
                  {cm.total}
                </Text>
                <View style={{ gap: 8, marginTop: 16 }}>
                  <Bullet
                    color={STATUS_COLORS.active}
                    label="Active"
                    value={`${cm.active}`}
                  />
                  <Bullet
                    color={STATUS_COLORS.pending}
                    label="Pending"
                    value={`${cm.pending}`}
                  />
                  <Bullet
                    color={STATUS_COLORS.completed}
                    label="Completed"
                    value={`${cm.completed}`}
                  />
                </View>
              </View>
              <View style={styles.heroRight}>
                <RingChart
                  size={170}
                  stroke={12}
                  centerLabel={`${cm.active}`}
                  centerSub="ACTIVE"
                  data={[
                    { value: cm.active, color: STATUS_COLORS.active },
                    { value: cm.pending, color: STATUS_COLORS.pending },
                    { value: cm.completed, color: STATUS_COLORS.completed },
                  ]}
                />
              </View>
            </View>
          </FloatInView>

          <FloatInView delay={200}>
            <View style={styles.tabRow}>
              {STATUS_TABS.map((t) => {
                const active = filter === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setFilter(t.id)}
                    style={({ pressed }) => [
                      styles.tabChip,
                      {
                        backgroundColor: active ? colors.primary : colors.muted,
                        borderRadius: 999,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.primaryForeground : colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 12,
                      }}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </FloatInView>

          {(!insightsLoading && cardData && !clientInsights?.error) && (
            <FloatInView delay={220}>
              <AIInsightCard
                title={cardData.title}
                summary={cardData.summary}
                riskLevel={cardData.riskLevel}
                items={cardData.items}
              />
            </FloatInView>
          )}
          {insightsLoading && (
            <FloatInView delay={220}>
              <AIInsightCard
                title="Client Portfolio Health"
                summary=""
                loading={true}
              />
            </FloatInView>
          )}

          <View style={{ gap: 12, marginTop: 16 }}>
            {filtered.map((c, i) => (
              <FloatInView key={c.id} delay={250 + i * 60}>
                <Pressable
                  onPress={() => router.push(`/client/${c.id}` as any)}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderRadius: colors.radius,
                          opacity: pressed ? 0.9 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.cardName,
                              {
                                color: colors.foreground,
                                fontFamily: "Inter_700Bold",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {c.company}
                          </Text>
                          <Text
                            style={[
                              styles.cardContact,
                              {
                                color: colors.mutedForeground,
                                fontFamily: "Inter_500Medium",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {c.contact} · {c.email}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor:
                                getStatusColor(c.status) + "1A",
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: getStatusColor(c.status) },
                            ]}
                          />
                          <Text
                            style={{
                              color: getStatusColor(c.status),
                              fontFamily: "Inter_600SemiBold",
                              fontSize: 10,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {c.status}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardBottom}>
                        <View style={styles.metaRow}>
                          <Feather
                            name="map-pin"
                            size={12}
                            color={colors.mutedForeground}
                          />
                          <Text
                            style={[
                              styles.metaText,
                              {
                                color: colors.mutedForeground,
                                fontFamily: "Inter_500Medium",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {c.location}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={[
                              styles.cardAmount,
                              {
                                color: colors.foreground,
                                fontFamily: "Inter_700Bold",
                                fontVariant: ["tabular-nums"],
                              },
                            ]}
                          >
                            {fmt(c.paid)}
                          </Text>
                          <Text
                            style={[
                              styles.cardAmountLabel,
                              {
                                color: colors.mutedForeground,
                                fontFamily: "Inter_500Medium",
                              },
                            ]}
                          >
                            {t("clients.lifetimePaid")}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </Pressable>
              </FloatInView>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Bullet({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.bullet}>
      <View style={[styles.bulletDot, { backgroundColor: color }]} />
      <Text style={[styles.bulletLabel, { fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <Text style={[styles.bulletValue, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 4 },
  heroCard: {
    marginTop: 18,
    borderRadius: 26,
    overflow: "hidden",
    flexDirection: "row",
    padding: 22,
    minHeight: 220,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  heroGlowA: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(37,99,235,0.18)",
  },
  heroGlowB: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  heroLeft: { flex: 1, justifyContent: "center", paddingRight: 8 },
  heroRight: { alignItems: "flex-end", justifyContent: "center" },
  heroLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    letterSpacing: 1,
  },
  heroNum: { color: "#fff", fontSize: 56, letterSpacing: -2, marginTop: 4 },
  bullet: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletDot: { width: 8, height: 8, borderRadius: 4 },
  bulletLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, flex: 1 },
  bulletValue: { color: "#fff", fontSize: 14 },

  tabRow: { flexDirection: "row", gap: 8, marginTop: 22, flexWrap: "wrap" },
  tabChip: { paddingHorizontal: 12, paddingVertical: 7 },

  card: { padding: 16, borderWidth: 1 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardName: { fontSize: 16 },
  cardContact: { fontSize: 12, marginTop: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 14,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  metaText: { fontSize: 12 },
  cardAmount: { fontSize: 16, letterSpacing: -0.4 },
  cardAmountLabel: { fontSize: 11, marginTop: 2 },
});
