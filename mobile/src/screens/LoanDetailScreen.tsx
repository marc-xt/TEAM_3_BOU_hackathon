import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import DisclosureCard from "../components/DisclosureCard";
import type { StoredLoan, Payment } from "../domain/types";
import { colors, space, fmtUGX, fmtDate } from "../theme";

export default function LoanDetailScreen({ route }: any) {
  const { t } = useTranslation();
  const loan = route.params.loan as StoredLoan;
  // Newest first for display.
  const history: Payment[] = [...(loan.payments ?? [])].sort((a, b) => b.date - a.date);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Predatory offers get an upfront warning before the numbers. */}
      {loan.is_predatory && (
        <View style={styles.warn}>
          <Text style={styles.warnTitle}>⚠ {t("loan.thinkTwice")}</Text>
          <Text style={styles.warnBody}>{t("loan.thinkTwiceBody")}</Text>
        </View>
      )}

      <DisclosureCard loan={loan} />

      {!loan.is_repaid && loan.kind === "DISBURSEMENT" && (
        <View style={styles.owedCard}>
          <Text style={styles.owedLabel}>{t("loan.outstanding")}</Text>
          <Text style={styles.owedValue}>{fmtUGX(loan.outstanding)}</Text>
        </View>
      )}

      {loan.kind === "DISBURSEMENT" && history.length > 0 && (
        <View style={styles.rep}>
          <Text style={styles.repTitle}>{t("loan.repayments")}</Text>
          <Text style={styles.repHint}>{t("loan.repaymentsHint")}</Text>
          <View style={[styles.row, styles.head]}>
            <Text style={[styles.hCell, styles.cDate]}>{t("loan.date")}</Text>
            <Text style={[styles.hCell, styles.cPaid]}>{t("loan.paid")}</Text>
            <Text style={[styles.hCell, styles.cBal]}>{t("loan.balance")}</Text>
          </View>
          {history.map((p, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.cell, styles.cDate]}>{fmtDate(isoDay(p.date))}</Text>
              {p.kind === "disbursed" ? (
                <Text style={[styles.cell, styles.cPaid, styles.muted]}>{t("loan.disbursed")}</Text>
              ) : (
                <Text style={[styles.cell, styles.cPaid, styles.paid]}>−{fmtUGX(p.amount).replace("UGX ", "")}</Text>
              )}
              <Text style={[styles.cell, styles.cBal, styles.balc]}>{fmtUGX(p.balanceAfter).replace("UGX ", "")}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: space.s3, gap: space.s3 },
  warn: { backgroundColor: colors.highBg, borderRadius: 12, padding: space.s3, gap: space.s1 },
  warnTitle: { color: colors.high, fontWeight: "800", fontSize: 15 },
  warnBody: { color: colors.text, fontSize: 13, lineHeight: 18 },
  owedCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: space.s4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  owedLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  owedValue: { color: colors.maroon, fontSize: 28, fontWeight: "800", marginTop: space.s1 },
  rep: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: space.s3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repTitle: { color: colors.maroon, fontWeight: "800", fontSize: 15 },
  repHint: { color: colors.muted, fontSize: 12, marginBottom: space.s2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space.s2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  head: { borderTopWidth: 0 },
  hCell: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  cell: { fontSize: 13 },
  cDate: { flex: 1, textAlign: "left", color: colors.text, fontWeight: "600" },
  cPaid: { width: 90, textAlign: "left" },
  cBal: { width: 90, textAlign: "right" },
  muted: { color: colors.muted },
  paid: { color: colors.stable, fontWeight: "700" },
  balc: { color: colors.muted },
});
