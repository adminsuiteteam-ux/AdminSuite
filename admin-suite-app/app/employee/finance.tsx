import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { FloatInView } from "@/components/FloatInView";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";

export default function EmployeeFinanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { t } = useTranslation();
  const { employees, refresh: refreshAllData, subscriptionLimits } = useData();
  const { id } = useLocalSearchParams();
  const employee = employees.find((e) => String(e.id) === String(id));

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentPlan = subscriptionLimits?.plan || 'BASIC';
  const canEditFinancials = ['PRO', 'PRO_YEARLY'].includes(currentPlan);

  const [editCurrentPay, setEditCurrentPay] = useState("");
  const [editEmployeeOwes, setEditEmployeeOwes] = useState("");
  const [editCompanyOwes, setEditCompanyOwes] = useState("");
  const [editShares, setEditShares] = useState("");
  const [editBonuses, setEditBonuses] = useState("");
  const [editDeductions, setEditDeductions] = useState("");

  if (!employee) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.foreground }}>{t("finance.employeeNotFound")}</Text>
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

  const startEditing = () => {
    if (!canEditFinancials) {
      return Alert.alert(
        t("finance.featureGated"),
        t("finance.featureGatedMessage")
      );
    }
    setEditCurrentPay(String(currentPay));
    setEditEmployeeOwes(String(employeeOwes));
    setEditCompanyOwes(String(companyOwes));
    setEditShares(String(shares));
    setEditBonuses(String(bonuses));
    setEditDeductions(String(deductions));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveChanges = async () => {
    const pay = parseFloat(editCurrentPay);
    const eOwes = parseFloat(editEmployeeOwes);
    const cOwes = parseFloat(editCompanyOwes);
    const sh = parseFloat(editShares);
    const bon = parseFloat(editBonuses);
    const ded = parseFloat(editDeductions);

    if (isNaN(pay) || pay < 0) return Alert.alert(t("finance.validationError"), t("finance.currentPayValidation"));
    if (isNaN(eOwes) || eOwes < 0) return Alert.alert(t("finance.validationError"), t("finance.employeeOwesValidation"));
    if (isNaN(cOwes) || cOwes < 0) return Alert.alert(t("finance.validationError"), t("finance.companyOwesValidation"));
    if (isNaN(sh) || sh < 0 || sh > 100) return Alert.alert(t("finance.validationError"), t("finance.sharesValidation"));
    if (isNaN(bon) || bon < 0) return Alert.alert(t("finance.validationError"), t("finance.bonusesValidation"));
    if (isNaN(ded) || ded < 0) return Alert.alert(t("finance.validationError"), t("finance.deductionsValidation"));

    try {
      setIsSaving(true);
      await apiService.patchEmployee(employee.id, {
        finance_data: {
          current_pay: pay,
          employee_owes_company: eOwes,
          company_owes_employee: cOwes,
          shares: sh,
          bonuses: bon,
          deductions: ded
        }
      });
      await refreshAllData();
      setIsEditing(false);
    } catch (err) {
      console.warn("Failed to save financials:", err);
      Alert.alert(t("finance.error"), t("finance.failedToUpdate"));
    } finally {
      setIsSaving(false);
    }
  };

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
          <Pressable 
            onPress={isEditing ? cancelEditing : () => router.back()} 
            style={styles.iconBtn} 
            hitSlop={10}
          >
            <Feather name={isEditing ? "x" : "chevron-left"} size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
              {isEditing ? t("finance.editFinancials") : t("finance.financialRecord")}
            </Text>
            <Text style={[styles.headerSub, { fontFamily: "Inter_500Medium" }]}>
              {employee.name}
            </Text>
          </View>
          <Pressable 
            onPress={isEditing ? saveChanges : startEditing} 
            style={[styles.iconBtn, isSaving && { opacity: 0.5 }]} 
            disabled={isSaving}
            hitSlop={10}
          >
            <Feather name={isEditing ? "check" : (canEditFinancials ? "edit-2" : "lock")} size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { fontFamily: "Inter_500Medium" }]}>{t("finance.currentPay")}</Text>
            <Text style={[styles.summaryValue, { fontFamily: "Inter_700Bold" }]}>{fmt(currentPay)}</Text>
            <Text style={[styles.summaryMeta, { fontFamily: "Inter_500Medium" }]}>{t("finance.monthly")}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { fontFamily: "Inter_500Medium" }]}>{t("finance.totalPaid")}</Text>
            <Text style={[styles.summaryValue, { color: "#86efac", fontFamily: "Inter_700Bold" }]}>{fmt(totalPaid)}</Text>
            <Text style={[styles.summaryMeta, { fontFamily: "Inter_500Medium" }]}>{paidCount} {t("finance.months")}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { fontFamily: "Inter_500Medium" }]}>{t("finance.pending")}</Text>
            <Text style={[styles.summaryValue, { color: "#fca5a5", fontFamily: "Inter_700Bold" }]}>{fmt(totalPending)}</Text>
            <Text style={[styles.summaryMeta, { fontFamily: "Inter_500Medium" }]}>{pendingCount} {t("finance.months")}</Text>
          </View>
        </View>
      </View>

      {isEditing ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          <FloatInView>
            <FormInput label={t("finance.monthlySalaryLabel")} value={editCurrentPay} onChangeText={setEditCurrentPay} />
            <FormInput label={t("finance.employeeOwesCompanyLabel")} value={editEmployeeOwes} onChangeText={setEditEmployeeOwes} />
            <FormInput label={t("finance.companyOwesEmployeeLabel")} value={editCompanyOwes} onChangeText={setEditCompanyOwes} />
            <FormInput label={t("finance.companySharesPercent")} value={editShares} onChangeText={setEditShares} />
            <FormInput label={t("finance.bonusesEditLabel")} value={editBonuses} onChangeText={setEditBonuses} />
            <FormInput label={t("finance.deductionsEditLabel")} value={editDeductions} onChangeText={setEditDeductions} />
            
            <Pressable
              onPress={saveChanges}
              disabled={isSaving}
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: colors.radius,
                  alignItems: "center",
                  marginTop: 20,
                  opacity: pressed || isSaving ? 0.8 : 1
                }
              ]}
            >
              <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                {isSaving ? t("finance.savingChanges") : t("finance.saveFinancialRecord")}
              </Text>
            </Pressable>
          </FloatInView>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Debt & balance ───────────────────────────── */}
          <FloatInView>
            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <SectionLabel title={t("finance.balanceOverview")} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={styles.balanceRow}>
                  <View style={[styles.balanceDot, { backgroundColor: netBalance >= 0 ? "#22c55e" : "#ef4444" }]} />
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
                    {t("finance.netBalance")}
                  </Text>
                  <Text style={{ color: netBalance >= 0 ? "#22c55e" : "#ef4444", fontFamily: "Inter_700Bold", fontSize: 18 }}>
                    {netBalance >= 0 ? "+" : ""}{fmt(Math.abs(netBalance))}
                  </Text>
                </View>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4, paddingLeft: 20 }}>
                  {netBalance > 0
                    ? t("finance.companyOwesEmployee")
                    : netBalance < 0
                    ? t("finance.employeeOwesCompany")
                    : t("finance.noOutstandingBalance")}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <View style={[styles.halfCardIcon, { backgroundColor: "#ef44441A" }]}>
                    <Feather name="arrow-up-right" size={16} color="#ef4444" />
                  </View>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 8 }}>
                    {t("finance.employeeOwes")}
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
                    {t("finance.companyOwes")}
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
              <SectionLabel title={t("finance.companyShares")} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={[styles.sharesIcon, { backgroundColor: "#a855f71A" }]}>
                    <Feather name="bar-chart-2" size={20} color="#a855f7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 22 }}>
                      {shares > 0 ? `${shares}%` : t("finance.none")}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                      {shares > 0 ? t("finance.equityStake") : t("finance.noEquity")}
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
              <SectionLabel title={t("finance.bonusesAndDeductions")} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={[styles.halfCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <View style={[styles.halfCardIcon, { backgroundColor: "#22c55e1A" }]}>
                    <Feather name="gift" size={16} color="#22c55e" />
                  </View>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 8 }}>
                    {t("finance.bonuses")}
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
                    {t("finance.deductions")}
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
              <SectionLabel title={t("finance.payHistory")} />
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
                        <Text style={{ color: "#16a34a", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>{t("finance.paid")}</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Feather name="clock" size={11} color="#f97316" />
                        <Text style={{ color: "#f97316", fontFamily: "Inter_600SemiBold", fontSize: 11 }}>{t("finance.pendingStatus")}</Text>
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
              <SectionLabel title={t("finance.annualSummary")} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <SummaryRow label={t("finance.baseSalaryMonthly")} value={fmt(currentPay)} color={colors.foreground} colors={colors} />
                <SummaryRow label={t("finance.totalPaidThisYear")} value={fmt(totalPaid)} color="#22c55e" colors={colors} />
                <SummaryRow label={t("finance.totalPending")} value={fmt(totalPending)} color="#f97316" colors={colors} />
                <SummaryRow label={t("finance.bonusesEarned")} value={`+${fmt(bonuses)}`} color="#22c55e" colors={colors} />
                <SummaryRow label={t("finance.deductionsLabel")} value={`-${fmt(deductions)}`} color="#ef4444" colors={colors} />
                <View style={[styles.totalLine, { backgroundColor: colors.border }]} />
                <View style={styles.totalRow}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                    {t("finance.netCompensation")}
                  </Text>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                    {fmt(totalPaid + bonuses - deductions)}
                  </Text>
                </View>
              </View>
            </View>
          </FloatInView>
        </ScrollView>
      )}
    </View>
  );
}

/* ── Sub components ─────────────────────────────────────── */

function FormInput({ label, value, onChangeText, placeholder, keyboardType = "numeric" }: any) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: colors.radius,
        paddingHorizontal: 12,
        height: 48
      }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          style={{
            flex: 1,
            color: colors.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 15,
            padding: 0
          }}
        />
      </View>
    </View>
  );
}

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
