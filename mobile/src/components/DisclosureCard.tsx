// Plain-language loan disclosure — the RN port of the web DisclosureCard.
// Presentation only; all numbers/flags come from the on-device parser.

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { ParsedLoan, StoredLoan } from "../domain/types";
import { colors, space, radius, fmtUGX, fmtDate } from "../theme";

export default function DisclosureCard({ loan }: { loan: ParsedLoan | StoredLoan }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, loan.is_predatory && styles.cardPredatory]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.lender}>{loan.lender}</Text>
          <Text style={[styles.licence, loan.is_licensed ? styles.licensed : styles.unlicensed]}>
            {loan.is_licensed ? t("loan.licensed") : t("loan.unlicensed")}
          </Text>
        </View>
        {loan.is_predatory && <Text style={styles.highCost}>{t("loan.highCost")}</Text>}
      </View>

      <Row label={t("loan.youReceive")} value={fmtUGX(loan.amount)} />
      <Row label={t("loan.youRepay")} value={fmtUGX(loan.total_repayable)} strong />
      {loan.fees.map((f, i) => (
        <Row key={i} label={f.label} value={fmtUGX(f.amount)} muted />
      ))}
      <Row label={t("loan.dueDate")} value={fmtDate(loan.due_date)} />
      {loan.term_days ? <Row label={t("loan.term")} value={t("loan.days", { n: loan.term_days })} /> : null}
      {loan.effective_rate_pct ? (
        <Row label={t("loan.cost")} value={t("loan.costValue", { pct: loan.effective_rate_pct })} />
      ) : null}
      {loan.daily_rate_pct ? (
        <Row label={t("loan.daily")} value={t("loan.dailyValue", { pct: loan.daily_rate_pct })} />
      ) : null}

      {loan.flags.length > 0 && (
        <View style={styles.flags}>
          {loan.flags.map((flag) => (
            <Text key={flag} style={styles.flagTag}>
              {t(`flags.${flag}`)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, muted && styles.rowMuted]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong, muted && styles.rowMuted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    padding: space.s3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPredatory: { borderColor: colors.high, borderWidth: 2 },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.s3 },
  lender: { fontSize: 18, fontWeight: "700", color: colors.text },
  licence: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  licensed: { color: colors.stable },
  unlicensed: { color: colors.high },
  highCost: {
    color: "#fff",
    backgroundColor: colors.high,
    paddingHorizontal: space.s2,
    paddingVertical: space.s1,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: space.s2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: { color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: "600" },
  rowStrong: { fontSize: 20, fontWeight: "800", color: colors.maroon },
  rowMuted: { color: colors.muted, fontWeight: "500" },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: space.s2, marginTop: space.s3 },
  flagTag: {
    color: colors.high,
    backgroundColor: colors.highBg,
    borderRadius: 8,
    paddingHorizontal: space.s2,
    paddingVertical: space.s1,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
});
