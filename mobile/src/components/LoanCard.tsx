// Compact loan row for the Home list: lender, you-repay, due + days-left,
// network dot, and risk/overdue/rising badges.

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import type { StoredLoan } from "../domain/types";
import { colors, space, radius, fmtUGX, fmtDate, daysLeft } from "../theme";

const NET_DOT: Record<string, string> = { MTN: "#ffcc00", AIRTEL: "#e40000", OTHER: colors.muted };

export default function LoanCard({ loan, onPress }: { loan: StoredLoan; onPress: () => void }) {
  const { t } = useTranslation();
  const isOffer = loan.kind === "OFFER";
  const dl = daysLeft(loan.due_date);
  const dueLabel =
    isOffer || loan.is_repaid ? null : loan.is_overdue ? t("loan.overdue") : dl === 0 ? t("loan.dueToday") : dl !== null ? t("loan.daysLeft", { n: dl }) : null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.top}>
        <View style={styles.lenderRow}>
          <View style={[styles.dot, { backgroundColor: NET_DOT[loan.network] }]} />
          <Text style={styles.lender} numberOfLines={1}>{loan.lender}</Text>
        </View>
        {loan.is_predatory && <Text style={styles.riskTag}>{t("loan.highCost")}</Text>}
      </View>

      <View style={styles.amounts}>
        <Text style={styles.owed}>{fmtUGX(isOffer ? loan.total_repayable : loan.is_repaid ? 0 : loan.outstanding)}</Text>
        <Text style={styles.owedLabel}>{isOffer ? t("loan.wouldRepay") : t("loan.outstanding")}</Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.due}>{fmtDate(loan.due_date)}</Text>
        {dueLabel ? (
          <Text style={[styles.dueBadge, loan.is_overdue && styles.overdueBadge]}>{dueLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    padding: space.s3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.s2,
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lenderRow: { flexDirection: "row", alignItems: "center", gap: space.s2, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  lender: { fontSize: 16, fontWeight: "700", color: colors.text, flexShrink: 1 },
  riskTag: {
    color: "#fff",
    backgroundColor: colors.high,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: space.s2,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  amounts: { flexDirection: "row", alignItems: "baseline", gap: space.s2 },
  owed: { fontSize: 22, fontWeight: "800", color: colors.maroon },
  owedLabel: { fontSize: 13, color: colors.muted },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  due: { fontSize: 13, color: colors.muted },
  dueBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.emerging,
    backgroundColor: colors.emergingBg,
    paddingHorizontal: space.s2,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  overdueBadge: { color: colors.high, backgroundColor: colors.highBg },
});
