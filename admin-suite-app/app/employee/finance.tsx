import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
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

export default function EmployeeFinanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { employees } = useData();
  const { id } = useLocalSearchParams();
  const employee = employees.find((e) => String(e.id) === String(id));

  if (!employee) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.foreground }}>Employee not found</Text>
      </View>
    );
  }

  const fin = employee.finance || {};
  const payHistory = fin.pay_history || [];
  
  const totalPaid = payHistory.filter((m: any) => m.paid).reduce((s: number, m: any) => s + Number(m.amount), 0);
  const totalPending = payHistory.filter((m: any) => !m.paid).reduce((s: number, m: any) => s + Number(m.amount), 0);
  const paidCount = payHistory.filter((m: any) => m.paid).length;
  const pendingCount = payHistory.filter((m: any) => !m.paid).length;

  const currentPay = Number(fin.current_pay || 0);
  const employeeOwes = Number(fin.employee_owes_company || 0);
  const companyOwes = Number(fin.company_owes_employee || 0);
  const shares = Number(fin.shares || 0);
  const bonuses = Number(fin.bonuses || 0);
  const deductions = Number(fin.deductions || 0);

  const netBalance = companyOwes - employeeOwes;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ─────────────────────────────────────── */}
      <View style={[styles.headerBg, { paddingTop: insets.top + 12 }]}>
        <LinearGradient
          colors={["#000000", "#0a0a0a", "#1e3a5f"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerGlow} />
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
            <Feather name="chevron-left" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
              Financial Record
            </Text>
            <Text style={[styles.headerSub, { fontFamily: "Inter_500Medium" }]}>
              {employee.name}
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { fontFamily: "Inter_500Medium" }]}>CURRENT PAY</Text>
            <Text style={[styles.summaryValue, { fontFamily: "Inter_700Bold" }]}>{fmt(currentPay)}</Text>
            <Text style={[styles.summaryMeta, { fontFamily: "Inter_500Medium" }]}>monthly</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { fontFamily: "Inter_500Medium" }]}>TOTAL PAID</Text>
            <Text style={[styles.summaryValue, { color: "#86efac", fontFamily: "Inter_700Bold" }]}>{fmt(totalPaid)}</Text>
            <Text style={[styles.summaryMeta, { fontFamily: "Inter_500Medium" }]}>{paidCount} months</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { fontFamily: "Inter_500Medium" }]}>PENDING</Text>
            <Text style={[styles.summaryValue, { color: "#fca5a5", fontFamily: "Inter_700Bold" }]}>{fmt(totalPending)}</Text>
            <Text style={[styles.summaryMeta, { fontFamily: "Inter_500Medium" }]}>{pendingCount} months</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Debt & balance ───────────────────────────── */}
        <FloatInView>
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <SectionLabel title="Balance overview" />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.balanceRow}>
                <View style={[styles.balanceDot, { backgroundColor: netBalance >= 0 ? "#22c55e" : "#ef4444" }]} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
                  Net balance
                </Text>
                <Text style={{ color: netBalance >= 0 ? "#22c55e" : "#ef4444", fontFamily: "Inter_700Bold", fontSize: 18 }}>
                  {netBalance >= 0 ? "+" : ""}{fmt(Math.abs(netBalance))}
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4, paddingLeft: 20 }}>
                {netBalance > 0
                  ? "The company owes this employee"
                  : netBalance < 0
                  ? "This employee owes the company"
                  : "No outstanding balance"}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.halfCardIcon, { backgroundColor: "#ef44441A" }]}>
                  <Feather name="arrow-up-right" size={16} color="#ef4444" />
                </View>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 8 }}>
                  EMPLOYEE OWES
                </Text>
                <Text style={{ color: employeeOwes > 0 ? "#ef4444" : colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 2 }}>
                  {fmt(employeeOwes)}
                </Text>
              </View>
              <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.halfCardIcon, { backgroundColor: "#22c55e1A" }]}>
                  <Feather name="arrow-down-left" size={16} color="#22c55e" />
                </View>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 8 }}>
                  COMPANY OWES
                </Text>
                <Text style={{ color: companyOwes > 0 ? "#22c55e" : colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 2 }}>
                  {fmt(companyOwes)}
                </Text>
              </View>
            </View>
          </View>
        </FloatInView>

        {/* ── Shares ───────────────────────────────────── */}
        <FloatInView delay={100}>
          <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
            <SectionLabel title="Company shares" />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.sharesIcon, { backgroundColor: "#a855f71A" }]}>
                  <Feather name="bar-chart-2" size={20} color="#a855f7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 22 }}>
                    {shares > 0 ? `${shares}%` : "None"}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                    {shares > 0 ? "Equity stake in the company" : "No equity allocation"}
                  </Text>
                </View>
              </View>
              {shares > 0 && (
                <View style={[styles.sharesBar, { backgroundColor: colors.muted, marginTop: 14 }]}>
                  <View style={[styles.sharesFill, { width: `${Math.min(shares * 10, 100)}%` }]} />
                </View>
              )}
            </View>
          </View>
        </FloatInView>

        {/* ── Bonuses & deductions ─────────────────────── */}
        <FloatInView delay={160}>
          <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
            <SectionLabel title="Bonuses & deductions" />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.halfCardIcon, { backgroundColor: "#22c55e1A" }]}>
                  <Feather name="gift" size={16} color="#22c55e" />
                </View>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 8 }}>
                  BONUSES
                </Text>
                <Text style={{ color: "#22c55e", fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 2 }}>
                  +{fmt(bonuses)}
                </Text>
              </View>
              <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.halfCardIcon, { backgroundColor: "#ef44441A" }]}>
                  <Feather name="minus-circle" size={16} color="#ef4444" />
                </View>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 8 }}>
                  DEDUCTIONS
                </Text>
                <Text style={{ color: "#ef4444", fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 2 }}>
                  -{fmt(deductions)}
                </Text>
              </View>
            </View>
          </View>
        </FloatInView>

        {/* ── Pay history ──────────────────────────────── */}
        <FloatInView delay={220}>
          <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
            <SectionLabel title="Pay history" />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, paddingVertical: 0 }]}>
              {payHistory.map((m: any, i: number) => (
                <View
                  key={m.month}
                  style={[
                    styles.payRow,
                    i < payHistory.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.monthChip, { backgroundColor: m.paid ? "#22c55e1A" : colors.muted, borderColor: m.paid ? "#22c55e" : colors.border }]}>
                    <Text style={{ color: m.paid ? "#16a34a" : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                      {m.month}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {fmt(Number(m.amount))}
                    </Text>
                  </View>
                  {m.paid ? (
                    <View style={styles.paidBadge}>
                      <Feather name="check" size={11} color="#16a34a" />
                      <Text style={{ color: "#16a34a", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Paid</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Feather name="clock" size={11} color="#f97316" />
                      <Text style={{ color: "#f97316", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Pending</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </FloatInView>

        {/* ── Summary bar at bottom ────────────────────── */}
        <FloatInView delay={280}>
          <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
            <SectionLabel title="Annual summary" />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <SummaryRow label="Base salary (monthly)" value={fmt(currentPay)} color={colors.foreground} colors={colors} />
              <SummaryRow label="Total paid this year" value={fmt(totalPaid)} color="#22c55e" colors={colors} />
              <SummaryRow label="Total pending" value={fmt(totalPending)} color="#f97316" colors={colors} />
              <SummaryRow label="Bonuses earned" value={`+${fmt(bonuses)}`} color="#22c55e" colors={colors} />
              <SummaryRow label="Deductions" value={`-${fmt(deductions)}`} color="#ef4444" colors={colors} />
              <View style={[styles.totalLine, { backgroundColor: colors.border }]} />
              <View style={styles.totalRow}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                  Net compensation
                </Text>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                  {fmt(totalPaid + bonuses - deductions)}
                </Text>
              </View>
            </View>
          </View>
        </FloatInView>
      </ScrollView>
    </View>
  );
}

/* ── Sub components ─────────────────────────────────────── */

function SectionLabel({ title }: { title: string }) {
  const colors = useColors();
  return (
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
  );
}

function SummaryRow({ label, value, color, colors }: { label: string; value: string; color: string; colors: any }) {
  return (
    <View style={styles.summaryLineRow}>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
        {label}
      </Text>
      <Text style={{ color, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
        {value}
      </Text>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  headerBg: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: -50,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(37,99,235,0.25)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, letterSpacing: -0.3 },
  headerSub: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 2 },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 18,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  summaryMeta: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  halfCard: {
    flex: 1,
    borderWidth: 1,
    padding: 14,
  },
  halfCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sharesIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sharesBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  sharesFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#a855f7",
  },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#22c55e1A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f973161A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  summaryLineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  totalLine: {
    height: 1,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
});
