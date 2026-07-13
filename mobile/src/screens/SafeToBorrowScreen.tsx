import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/context";
import { estimateMonthlyIncome, computeAffordability } from "../domain/insights";
import { SAMPLE_TRANSACTIONS } from "../data/sampleTransactions";
import { colors, space, radius, fmtUGX } from "../theme";

export default function SafeToBorrowScreen() {
  const { t } = useTranslation();
  const { loans } = useApp();
  const income = estimateMonthlyIncome(SAMPLE_TRANSACTIONS);
  const a = computeAffordability(income, loans);
  const usedFraction = income > 0 ? Math.min(0.95, a.existingRepay / (income / 3)) : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.income}>
        <Text style={styles.incomeLabel}>{t("safe.incomeLabel")}</Text>
        <Text style={styles.incomeValue}>≈ {fmtUGX(a.monthlyIncome)} / {t("safe.month")}</Text>
        <Text style={styles.incomeSub}>{t("safe.incomeSub")}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.recLabel}>{t("safe.canBorrow")}</Text>
        <Text style={styles.recAmount}>{fmtUGX(a.safeAmount)}</Text>
        <Text style={styles.recSub}>{t("safe.at", { pct: a.fairRatePct })}</Text>

        <View style={styles.meter}>
          <View style={[styles.seg, { flex: 55, backgroundColor: colors.stable }]} />
          <View style={[styles.seg, { flex: 25, backgroundColor: colors.emerging }]} />
          <View style={[styles.seg, { flex: 20, backgroundColor: colors.high }]} />
          <View style={[styles.marker, { left: `${usedFraction * 100}%` }]} />
        </View>
        <View style={styles.meterLabels}>
          <Text style={styles.meterLabel}>{t("safe.comfortable")}</Text>
          <Text style={styles.meterLabel}>{t("safe.tight")}</Text>
          <Text style={styles.meterLabel}>{t("safe.risky")}</Text>
        </View>
      </View>

      <View style={styles.lay}>
        <Text style={styles.layText}>💡 {t("safe.lay")}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: space.s3, gap: space.s3 },
  income: { backgroundColor: colors.maroon, borderRadius: radius, padding: space.s3 },
  incomeLabel: { color: colors.gold, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  incomeValue: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  incomeSub: { color: "#f0dfae", fontSize: 11, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: space.s3, alignItems: "center" },
  recLabel: { color: colors.text, fontSize: 14, fontWeight: "600" },
  recAmount: { color: colors.stable, fontSize: 30, fontWeight: "900", marginTop: 2 },
  recSub: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
  meter: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", width: "100%", marginTop: space.s3, position: "relative" },
  seg: { height: 14 },
  marker: { position: "absolute", top: -4, width: 3, height: 22, backgroundColor: colors.text, borderRadius: 2 },
  meterLabels: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 4 },
  meterLabel: { fontSize: 10, color: colors.muted },
  lay: { backgroundColor: colors.stableBg, borderRadius: 10, padding: space.s3 },
  layText: { color: "#0b4f32", fontSize: 13, lineHeight: 19 },
});
