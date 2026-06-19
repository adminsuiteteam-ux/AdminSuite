import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatInView } from "@/components/FloatInView";
import { IncomeExpenseChart } from "@/components/IncomeExpenseChart";
import { useData } from "@/context/DataContext";
import { useCurrencyFmt } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { AIInsightCard } from "@/components/AIInsightCard";
import { aiService, AIFinanceForecast } from "@/services/aiService";
import { AIReportModal } from "@/components/AIReportModal";

export default function FinanceScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fmt = useCurrencyFmt();
  const { metrics: m, payrollMetrics: pr, debts, budgetCategories, transactions, payrollMonths, togglePayrollMonth } = useData();
  const [debtTab, setDebtTab] = useState("we_owe");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [forecast, setForecast] = useState<AIFinanceForecast | null>(null);
  const [forecastLoading, setForecastLoading] = useState(true);

  React.useEffect(() => {
    let active = true;
    aiService.getFinanceForecast()
      .then(res => {
        if (active && res.data) {
          setForecast(res.data);
        }
      })
      .catch(err => {
        console.error("Failed to load AI finance forecast:", err);
      })
      .finally(() => {
        if (active) {
          setForecastLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;

  const chartData = React.useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      
      const inVal = transactions
        .filter(t => t.type === "income" && t.date.includes(label))
        .reduce((s, t) => s + Number(t.amount), 0);
      
      const outVal = transactions
        .filter(t => t.type === "expense" && t.date.includes(label))
        .reduce((s, t) => s + Number(t.amount), 0);
        
      months.push({ label, income: inVal || 0, expense: outVal || 0 });
    }
    return months;
  }, [transactions]);

  const totalWeOwe = debts.weOwe.reduce((s, d) => s + Number(d.amount), 0);
  const totalOwedUs = debts.owedToUs.reduce((s, d) => s + Number(d.amount), 0);
  const totalAlloc = budgetCategories.reduce((s, c) => s + Number(c.allocated), 0);
  const totalSpent = budgetCategories.reduce((s, c) => s + Number(c.spent), 0);

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
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.title,
                    { color: colors.foreground, fontFamily: "Inter_700Bold" },
                  ]}
                >
                  {t('finance.title')}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {t('finance.subtitle')}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => setReportOpen(true)}
                  style={({ pressed }) => [
                    styles.addBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: colors.radius,
                      transform: [{ scale: pressed ? 0.92 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Feather name="file-text" size={18} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={() => setAddMenuOpen(true)}
                  style={({ pressed }) => [
                    styles.addBtn,
                    {
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
            </View>
          </FloatInView>

          <FloatInView delay={100}>
            <View style={styles.profitCard}>
              <LinearGradient
                colors={["#000000", "#0a0a0a", "#0f172a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.profitGlowA} />
              <View style={styles.profitGlowB} />
              <Text
                style={[styles.profitLabel, { fontFamily: "Inter_600SemiBold" }]}
              >
                {t('finance.netProfitThisMonth')}
              </Text>
              <Text style={[styles.profitValue, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}>
                {fmt(m.netProfit)}
              </Text>
              <View style={styles.deltaRow}>
                <View style={styles.deltaPill}>
                  <Feather name="trending-up" size={12} color="#22c55e" />
                  <Text
                    style={[styles.deltaText, { fontFamily: "Inter_700Bold" }]}
                  >
                    +18.2%
                  </Text>
                </View>
                <Text
                  style={[
                    styles.deltaSub,
                    { fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {t('finance.vsLastMonth')}
                </Text>
              </View>
            </View>
          </FloatInView>

          {(!forecastLoading && forecast && !forecast.error) && (
            <FloatInView delay={130}>
              <AIInsightCard
                title={`Finance Forecast (${forecast.profit_estimate})`}
                summary={forecast.assessment}
                riskLevel={
                  forecast.profit_trend === 'down' ? 'high' :
                  forecast.profit_trend === 'stable' ? 'medium' : 'low'
                }
                items={forecast.recommendations}
              />
            </FloatInView>
          )}
          {forecastLoading && (
            <FloatInView delay={130}>
              <AIInsightCard
                title="Finance Forecast"
                summary=""
                loading={true}
              />
            </FloatInView>
          )}

          <FloatInView delay={160}>
            <View style={styles.chartCard}>
              <LinearGradient
                colors={["#000000", "#0a0a0a", "#000000"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.chartGlow} />
              <View style={styles.chartHeader}>
                <View>
                  <Text
                    style={[styles.chartTitle, { fontFamily: "Inter_700Bold" }]}
                  >
                    {t('finance.incomeVsExpense')}
                  </Text>
                  <Text
                    style={[
                      styles.chartSub,
                      { fontFamily: "Inter_500Medium" },
                    ]}
                  >
                    {t('finance.last7Months')}
                  </Text>
                </View>
                <View style={styles.chartTotals}>
                  <View>
                    <Text
                      style={[styles.totalIn, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}
                    >
                      {fmt(m.totalIncome)}
                    </Text>
                    <Text
                      style={[styles.totalLab, { fontFamily: "Inter_500Medium" }]}
                    >
                      {t('finance.in')}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[styles.totalOut, { fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] }]}
                    >
                      {fmt(m.totalExpense)}
                    </Text>
                    <Text
                      style={[styles.totalLab, { fontFamily: "Inter_500Medium" }]}
                    >
                      {t('finance.out')}
                    </Text>
                  </View>
                </View>
              </View>
              <IncomeExpenseChart data={chartData} formatValue={fmt} />
            </View>
          </FloatInView>

          <FloatInView delay={220}>
            <SectionTitle title="Payroll status" />
            <View
              style={[
                styles.payrollCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.payrollHeader}>
                <View style={styles.payrollKpi}>
                  <Text
                    style={[
                      styles.payrollNum,
                      { color: colors.foreground, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {pr.staffPaid}
                  </Text>
                  <Text
                    style={[
                      styles.payrollLab,
                      {
                        color: colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                      },
                    ]}
                  >
                    {t('finance.staffPaid')}
                  </Text>
                </View>
                <View style={styles.payrollKpi}>
                  <Text
                    style={[
                      styles.payrollNum,
                      { color: "#22c55e", fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {pr.paid}
                  </Text>
                  <Text
                    style={[
                      styles.payrollLab,
                      {
                        color: colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                      },
                    ]}
                  >
                    {t('finance.monthsPaid')}
                  </Text>
                </View>
                <View style={styles.payrollKpi}>
                  <Text
                    style={[
                      styles.payrollNum,
                      { color: "#f97316", fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
                    ]}
                  >
                    {pr.unpaid}
                  </Text>
                  <Text
                    style={[
                      styles.payrollLab,
                      {
                        color: colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                      },
                    ]}
                  >
                    {t('finance.pendingLabel')}
                  </Text>
                </View>
              </View>
              <View style={styles.monthsRow}>
                {payrollMonths.map((m) => (
                  <Pressable
                    key={m.month}
                    onPress={() => togglePayrollMonth(m.month, m.paid)}
                    style={({ pressed }) => [
                      styles.monthChip,
                      {
                        backgroundColor: m.paid
                          ? "#22c55e1A"
                          : colors.muted,
                        borderColor: m.paid ? "#22c55e" : colors.border,
                        opacity: pressed ? 0.7 : 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: m.paid ? "#16a34a" : colors.mutedForeground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 11,
                      }}
                    >
                      {m.month}
                    </Text>
                    {m.paid ? (
                      <Feather name="check" size={11} color="#16a34a" />
                    ) : (
                      <Feather name="clock" size={11} color={colors.mutedForeground} />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          </FloatInView>

          <FloatInView delay={280}>
            <SectionTitle title="Debts & receivables" />
            <View
              style={[
                styles.debtCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.debtTabs}>
                <DebtTab
                  active={debtTab === "we_owe"}
                  label="We owe"
                  total={fmt(totalWeOwe)}
                  color="#ef4444"
                  onPress={() => setDebtTab("we_owe")}
                />
                <DebtTab
                  active={debtTab === "owed_us"}
                  label="Owed to us"
                  total={fmt(totalOwedUs)}
                  color="#22c55e"
                  onPress={() => setDebtTab("owed_us")}
                />
              </View>

              <View style={{ marginTop: 14, gap: 10 }}>
                {(debtTab === "we_owe" ? debts.weOwe : debts.owedToUs).map(
                  (d) => (
                    <View
                      key={d.id}
                      style={[
                        styles.debtRow,
                        { backgroundColor: colors.muted, borderRadius: 12 },
                      ]}
                    >
                      <View
                        style={[
                          styles.debtIcon,
                          {
                            backgroundColor:
                              debtTab === "we_owe" ? "#ef44441A" : "#22c55e1A",
                          },
                        ]}
                      >
                        <Feather
                          name={
                            debtTab === "we_owe"
                              ? "arrow-up-right"
                              : "arrow-down-left"
                          }
                          size={14}
                          color={debtTab === "we_owe" ? "#ef4444" : "#22c55e"}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 13,
                          }}
                        >
                          {d.party}
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontFamily: "Inter_500Medium",
                            fontSize: 11,
                          }}
                        >
                          {t('finance.due')} {d.due}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color:
                            debtTab === "we_owe" ? "#ef4444" : "#22c55e",
                          fontFamily: "Inter_700Bold",
                          fontSize: 14,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {fmt(d.amount)}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          </FloatInView>

          <FloatInView delay={340}>
            <SectionTitle title="Budget" action="Manage" onPress={() => router.push("/budget" as any)} />
            <Pressable onPress={() => router.push("/budget" as any)}>
              {({ pressed }) => (
                <View
                  style={[
                    styles.budgetCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={styles.budgetTop}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_500Medium",
                          fontSize: 11,
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        {t('finance.thisMonth')}
                      </Text>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_700Bold",
                          fontSize: 22,
                          letterSpacing: -0.4,
                          marginTop: 4,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {fmt(totalSpent)}{" "}
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 14,
                            fontFamily: "Inter_500Medium",
                          }}
                        >
                          / {fmt(totalAlloc)}
                        </Text>
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.budgetIcon,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Feather name="pie-chart" size={18} color={colors.primaryForeground} />
                    </View>
                  </View>
                  <View
                    style={[styles.budgetBar, { backgroundColor: colors.muted }]}
                  >
                    <View
                      style={[
                        styles.budgetFill,
                        {
                          width: `${Math.round((totalSpent / totalAlloc) * 100)}%`,
                          backgroundColor:
                            totalSpent / totalAlloc > 0.9 ? "#ef4444" : "#22c55e",
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.budgetCats}>
                    {budgetCategories.slice(0, 3).map((c) => (
                      <View key={c.id} style={styles.budgetCatRow}>
                        <View
                          style={[styles.budgetCatDot, { backgroundColor: c.color }]}
                        />
                        <Text
                          style={{
                            color: colors.foreground,
                            fontFamily: "Inter_500Medium",
                            fontSize: 12,
                            flex: 1,
                          }}
                        >
                          {c.name}
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 12,
                            fontVariant: ["tabular-nums"],
                          }}
                        >
                          {fmt(c.spent)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Pressable>
          </FloatInView>

          <FloatInView delay={400}>
            <SectionTitle title="Recent transactions" />
            <View
              style={[
                styles.txList,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              {transactions.map((t, i) => {
                const income = t.type === "income";
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {}}
                    style={({ pressed }) => [
                      styles.txRow,
                      i < transactions.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                      },
                      {
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.txIcon,
                        {
                          backgroundColor: income
                            ? "#22c55e1A"
                            : "#ef44441A",
                        },
                      ]}
                    >
                      <Feather
                        name={income ? "arrow-down-left" : "arrow-up-right"}
                        size={14}
                        color={income ? "#22c55e" : "#ef4444"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.txDesc,
                          { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                        ]}
                        numberOfLines={1}
                      >
                        {t.description}
                      </Text>
                      <Text
                        style={[
                          styles.txMeta,
                          {
                            color: colors.mutedForeground,
                            fontFamily: "Inter_400Regular",
                          },
                        ]}
                      >
                        {t.category} · {t.date}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        {
                          color: income ? "#22c55e" : "#ef4444",
                          fontFamily: "Inter_700Bold",
                          fontVariant: ["tabular-nums"],
                        },
                      ]}
                    >
                      {income ? "+" : "-"}
                      {fmt(t.amount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </FloatInView>
        </View>
      </ScrollView>

      <AIReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
      />

      {/* Add Options Menu */}
      <Modal visible={addMenuOpen} animationType="slide" transparent onRequestClose={() => setAddMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddMenuOpen(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.sheetHandle} />
          <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 16, paddingHorizontal: 4 }}>{t('finance.addNewRecord')}</Text>
          {[
            { icon: "arrow-down-left", label: "Income", color: "#22c55e", desc: "Record incoming payment" },
            { icon: "arrow-up-right", label: "Expenditure", color: "#ef4444", desc: "Log an expense" },
            { icon: "pie-chart", label: "Budget", color: "#2563eb", desc: "Go to budget management" },
            { icon: "piggy-bank" as any, label: "Savings", color: "#f59e0b", desc: "Document savings" },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                setAddMenuOpen(false);
                if (item.label === "Budget") router.push("/budget" as any);
                if (item.label === "Savings") router.push("/savings" as any);
                if (item.label === "Income") router.push("/transaction/create?type=income" as any);
                if (item.label === "Expenditure") router.push("/transaction/create?type=expense" as any);
              }}
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                }
              ]}
            >
              <View style={[styles.addMenuItem, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.addMenuIcon, { backgroundColor: item.color + "1A" }]}>
                  <Feather name={item.icon === "piggy-bank" ? "dollar-sign" : item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{item.label}</Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>{item.desc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitleRow}>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onPress} hitSlop={6}>
          <Text
            style={{
              color: colors.accent,
              fontFamily: "Inter_600SemiBold",
              fontSize: 12,
            }}
          >
            {action} →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DebtTab({ active, label, total, color, onPress }: { active: boolean; label: string; total: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <View
          style={[
            styles.debtTab,
            {
              backgroundColor: active ? color + "1A" : colors.muted,
              borderColor: active ? color : "transparent",
              transform: [{ scale: pressed ? 0.96 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: active ? color : colors.foreground,
              fontFamily: "Inter_600SemiBold",
              fontSize: 11,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              color: active ? color : colors.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 16,
              marginTop: 2,
              fontVariant: ["tabular-nums"],
            }}
          >
            {total}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 4 },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  profitCard: {
    marginTop: 18,
    padding: 22,
    borderRadius: 24,
    overflow: "hidden",
  },
  profitGlowA: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(37,99,235,0.25)",
  },
  profitGlowB: {
    position: "absolute",
    bottom: -60,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  profitLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    letterSpacing: 1,
  },
  profitValue: {
    color: "#fff",
    fontSize: 38,
    letterSpacing: -1,
    marginTop: 4,
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34,197,94,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deltaText: { color: "#22c55e", fontSize: 11 },
  deltaSub: { color: "rgba(255,255,255,0.65)", fontSize: 12 },

  chartCard: {
    marginTop: 16,
    borderRadius: 22,
    overflow: "hidden",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chartGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(249,115,22,0.12)",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  chartTitle: { color: "#fff", fontSize: 16, letterSpacing: -0.3 },
  chartSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginTop: 2,
  },
  chartTotals: { flexDirection: "row", gap: 16 },
  totalIn: { color: "#22c55e", fontSize: 13 },
  totalOut: { color: "#ef4444", fontSize: 13 },
  totalLab: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 2,
  },

  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  payrollCard: { padding: 16, borderWidth: 1 },
  payrollHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  payrollKpi: { alignItems: "center", flex: 1 },
  payrollNum: { fontSize: 22, letterSpacing: -0.4 },
  payrollLab: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  monthsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
  },
  monthChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  debtCard: { padding: 14, borderWidth: 1 },
  debtTabs: { flexDirection: "row", gap: 10 },
  debtTab: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "flex-start",
  },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  debtIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  budgetCard: { padding: 16, borderWidth: 1 },
  budgetTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  budgetIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetBar: { height: 8, borderRadius: 999, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 999 },
  budgetCats: { marginTop: 14, gap: 8 },
  budgetCatRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  budgetCatDot: { width: 8, height: 8, borderRadius: 4 },

  txList: { borderWidth: 1, overflow: "hidden" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  txDesc: { fontSize: 14 },
  txMeta: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14 },

  modalBackdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: 16,
  },
  addMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  addMenuIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
