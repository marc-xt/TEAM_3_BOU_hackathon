import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { StoredLoan } from "../domain/types";
import { colors, space, radius, fmtUGX } from "../theme";

export default function UnderstandLoanScreen({ route }: any) {
  const { t } = useTranslation();
  const loan = route.params.loan as StoredLoan;
  const extra = Math.max(0, loan.total_repayable - loan.amount);
  const days = loan.term_days ?? null;
  const perDay = days && days > 0 ? Math.round(extra / days) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headline}>
        <Text style={styles.headlineText}>
          {t("understand.headline", {
            amount: fmtUGX(loan.amount),
            repay: fmtUGX(loan.total_repayable),
            extra: fmtUGX(extra),
            days: days ?? "?",
          })}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h3}>{t("understand.meansTitle")}</Text>
        <View style={styles.meaning}>
          {perDay ? (
            <Row emoji="📅" text={t("understand.perDay", { perDay: fmtUGX(perDay) })} />
          ) : null}
          <Row emoji="⏰" text={t("understand.late")} />
          <Row emoji="📉" text={t("understand.early")} />
        </View>
      </View>

      {loan.effective_rate_pct ? (
        <View style={styles.card}>
          <Text style={styles.costLabel}>{t("understand.cost")}</Text>
          <Text style={styles.costValue}>
            {loan.effective_rate_pct}%
            {loan.daily_rate_pct ? <Text style={styles.costSub}>  ·  {loan.daily_rate_pct}% {t("understand.perDayShort")}</Text> : null}
          </Text>
        </View>
      ) : null}

      <View style={styles.coach}>
        <Text style={styles.coachText}>{t("understand.coach")}</Text>
      </View>
    </ScrollView>
  );
}

function Row({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: space.s3, gap: space.s3 },
  headline: { backgroundColor: colors.maroon, borderRadius: radius, padding: space.s4 },
  headlineText: { color: "#fff", fontSize: 16, fontWeight: "600", lineHeight: 24 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: space.s3 },
  h3: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: space.s2 },
  meaning: { gap: space.s2 },
  row: { flexDirection: "row", gap: space.s2, alignItems: "flex-start" },
  emoji: { fontSize: 15 },
  rowText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  costLabel: { color: colors.muted, fontSize: 12.5, fontWeight: "600" },
  costValue: { color: colors.maroon, fontSize: 24, fontWeight: "800", marginTop: 2 },
  costSub: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  coach: { backgroundColor: colors.stableBg, borderLeftWidth: 4, borderLeftColor: colors.stable, borderRadius: 8, padding: space.s3 },
  coachText: { color: "#0b4f32", fontSize: 13, lineHeight: 19 },
});
