/**
 * AIInsightCard — reusable component to display an AI-generated insight.
 * Used on employee detail pages, client lists, and the finance screen.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  title: string;
  summary: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'healthy' | 'at_risk' | 'urgent';
  items?: string[];
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}

const RISK_CONFIG = {
  low:     { color: '#22c55e', icon: 'check-circle' as const, label: 'Low Risk' },
  healthy: { color: '#22c55e', icon: 'check-circle' as const, label: 'Healthy' },
  medium:  { color: '#f59e0b', icon: 'alert-circle' as const, label: 'Medium Risk' },
  at_risk: { color: '#f59e0b', icon: 'alert-circle' as const, label: 'At Risk' },
  high:    { color: '#ef4444', icon: 'x-circle' as const, label: 'High Risk' },
  urgent:  { color: '#ef4444', icon: 'x-circle' as const, label: 'Urgent' },
};

export function AIInsightCard({
  title,
  summary,
  riskLevel,
  items = [],
  actionLabel,
  onAction,
  loading = false,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const risk = React.useMemo(() => {
    if (!riskLevel) return null;
    switch (riskLevel) {
      case 'low': return RISK_CONFIG.low;
      case 'healthy': return RISK_CONFIG.healthy;
      case 'medium': return RISK_CONFIG.medium;
      case 'at_risk': return RISK_CONFIG.at_risk;
      case 'high': return RISK_CONFIG.high;
      case 'urgent': return RISK_CONFIG.urgent;
      default: return null;
    }
  }, [riskLevel]);

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.loadingRow}>
          <Feather name="cpu" size={16} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            {t('ai.analysing', 'AI is analysing your data…')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="cpu" size={14} color={colors.primary} />
          <Text style={[styles.aiLabel, { color: colors.primary }]}>{t('ai.insight', 'AI Insight')}</Text>
        </View>
        {risk && (
          <View style={[styles.badge, { backgroundColor: risk.color + '22' }]}>
            <Feather name={risk.icon} size={12} color={risk.color} />
            <Text style={[styles.badgeText, { color: risk.color }]}>
              {t(`ai.risk_label.${riskLevel}`, risk.label)}
            </Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {/* Summary */}
      <Text style={[styles.summary, { color: colors.muted }]}>{summary}</Text>

      {/* Expandable items */}
      {items.length > 0 && (
        <>
          <Pressable
            onPress={() => setExpanded(!expanded)}
            style={styles.expandRow}
          >
            <Text style={[styles.expandLabel, { color: colors.primary }]}>
              {expanded
                ? t('ai.hide_details', 'Hide details')
                : t('ai.show_details', 'Show {{count}} details', {
                    count: items.length,
                    defaultValue: `Show ${items.length} detail${items.length !== 1 ? 's' : ''}`
                  })}
            </Text>
            <Feather
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.primary}
            />
          </Pressable>

          {expanded && (
            <View style={styles.itemList}>
              {items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Action button */}
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="zap" size={13} color="#fff" />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 4,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  summary: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  expandLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  itemList: {
    gap: 6,
    paddingTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
