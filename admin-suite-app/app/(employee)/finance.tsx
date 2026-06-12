import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatInView } from "@/components/FloatInView";
import { SectionHeader } from "@/components/SectionHeader";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";

export default function EmployeeFinanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const fetchFinanceData = async () => {
    try {
      setError("");
      const res = await apiService.getEmployeeFinance();
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load employee finance:", err);
      setError("Failed to load finance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const finance = data?.finance || {};
  const payHistory = data?.pay_history || [];
  const salary = data?.salary || 0;

  const totalBonuses = parseFloat(finance.bonuses || "0");
  const totalDeductions = parseFloat(finance.deductions || "0");
  const shares = parseFloat(finance.shares || "0");
  const netEarnings = salary + totalBonuses - totalDeductions;

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: tabBarPad,
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 960 }}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Financial Dashboard
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              View your salary details, bonuses, and payment history
            </Text>
          </View>

          {/* Earnings Overview Card */}
          <FloatInView delay={100}>
            <View style={[styles.cardOuter, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Estimated Net Payout
              </Text>
              <Text style={[styles.cardValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {fmt(netEarnings)}
              </Text>
              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownCol}>
                  <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Base Salary
                  </Text>
                  <Text style={[styles.breakdownVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {fmt(salary)}
                  </Text>
                </View>
                <View style={styles.breakdownCol}>
                  <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Bonuses
                  </Text>
                  <Text style={[styles.breakdownVal, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>
                    +{fmt(totalBonuses)}
                  </Text>
                </View>
                <View style={styles.breakdownCol}>
                  <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Deductions
                  </Text>
                  <Text style={[styles.breakdownVal, { color: colors.danger, fontFamily: "Inter_600SemiBold" }]}>
                    -{fmt(totalDeductions)}
                  </Text>
                </View>
              </View>
            </View>
          </FloatInView>

          {/* Additional Stats Grid */}
          <FloatInView delay={160}>
            <View style={styles.statsRow}>
              <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.miniIcon, { backgroundColor: colors.primary + "1A" }]}>
                  <Feather name="pie-chart" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]} numberOfLines={1} adjustsFontSizeToFit>
                    Company Shares
                  </Text>
                  <Text style={[styles.miniVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1} adjustsFontSizeToFit>
                    {shares}%
                  </Text>
                </View>
              </View>

              <View style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.miniIcon, { backgroundColor: colors.success + "1A" }]}>
                  <Feather name="credit-card" size={16} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]} numberOfLines={1} adjustsFontSizeToFit>
                    Owed to Company
                  </Text>
                  <Text style={[styles.miniVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1} adjustsFontSizeToFit>
                    {fmt(parseFloat(finance.employee_owes_company || "0"))}
                  </Text>
                </View>
              </View>
            </View>
          </FloatInView>

          {/* Payment History */}
          <FloatInView delay={220}>
            <View style={styles.section}>
              <SectionHeader title="Payout History" />
              <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                {payHistory.map((history: any, i: number) => (
                  <View
                    key={i}
                    style={[
                      styles.historyRow,
                      i < payHistory.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                    ]}
                  >
                    <View style={[styles.historyIconCircle, { backgroundColor: colors.primary + "1A" }]}>
                      <Feather name="check" size={14} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historyMonth, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                        Payout Month: {history.month}
                      </Text>
                      <Text style={[styles.historyAmount, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                        Amount: {fmt(parseFloat(history.amount))}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: history.paid ? colors.success + "15" : colors.warning + "15" }]}>
                      <Text style={[styles.statusText, { color: history.paid ? colors.success : colors.warning, fontFamily: "Inter_600SemiBold" }]}>
                        {history.paid ? "PAID" : "PENDING"}
                      </Text>
                    </View>
                  </View>
                ))}

                {payHistory.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    No payout records found.
                  </Text>
                )}
              </View>
            </View>
          </FloatInView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  cardOuter: {
    borderWidth: 1,
    padding: 20,
    width: "100%",
  },
  cardLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 32,
    marginTop: 6,
  },
  cardDivider: {
    height: 1,
    marginVertical: 16,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownCol: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 11,
  },
  breakdownVal: {
    fontSize: 14,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    width: "100%",
  },
  miniCard: {
    flex: 1,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  miniIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  miniLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  miniVal: {
    fontSize: 16,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    width: "100%",
  },
  listCard: {
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  historyMonth: {
    fontSize: 14,
  },
  historyAmount: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
  },
});
