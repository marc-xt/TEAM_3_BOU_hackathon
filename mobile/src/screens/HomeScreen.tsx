import React from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/context";
import HealthBanner from "../components/HealthBanner";
import LoanCard from "../components/LoanCard";
import BannedAppBanner from "../components/BannedAppBanner";
import { colors, space, fmtUGX } from "../theme";
import { summarize } from "../domain/health";
import { estimateMonthlyIncome, computeScore, computeAffordability } from "../domain/insights";
import { SAMPLE_TRANSACTIONS } from "../data/sampleTransactions";

export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { loans, health, refreshing, rising, refresh } = useApp();
  const active = loans.filter((l) => !l.is_repaid);
  const total = summarize(loans).totalOutstanding;
  const income = estimateMonthlyIncome(SAMPLE_TRANSACTIONS);
  const { score, bandKey } = computeScore(income, loans);
  const safeAmount = computeAffordability(income, loans).safeAmount;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={active}
      keyExtractor={(l) => l.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.maroon} />}
      ListHeaderComponent={
        <View style={{ gap: space.s3 }}>
          <BannedAppBanner />
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>{t("loan.outstanding")}</Text>
            <Text style={styles.totalValue}>{fmtUGX(total)}</Text>
          </View>
          <View style={styles.quickRow}>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("Score")}>
              <Text style={styles.quickTop}>{t("home.yourScore")}</Text>
              <Text style={styles.quickBig}>{score}</Text>
              <Text style={styles.quickSub}>{t(bandKey)}</Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => navigation.navigate("SafeToBorrow")}>
              <Text style={styles.quickTop}>{t("home.safeToBorrow")}</Text>
              <Text style={styles.quickBigSm}>{fmtUGX(safeAmount)}</Text>
              <Text style={styles.quickSub}>{t("home.upTo")}</Text>
            </Pressable>
          </View>
          {rising ? <Text style={styles.rising}>⚠️ {t("home.rising")}</Text> : null}
          {health ? <HealthBanner health={health} /> : null}
          <Text style={styles.section}>{t("home.activeLoans")}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginTop: space.s2 }}>
          <LoanCard loan={item} onPress={() => navigation.navigate("LoanDetail", { loan: item })} />
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t("home.noLoans")}</Text>
          <Pressable onPress={refresh}>
            <Text style={styles.emptyAction}>{t("home.noLoansAction")}</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.cream },
  content: { padding: space.s3, paddingBottom: space.s5 },
  totalCard: { backgroundColor: colors.maroon, borderRadius: 12, padding: space.s4 },
  totalLabel: { color: colors.gold, fontSize: 13, fontWeight: "600" },
  totalValue: { color: "#fff", fontSize: 30, fontWeight: "800", marginTop: space.s1 },
  rising: { color: colors.high, fontWeight: "700", fontSize: 14 },
  section: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: space.s2 },
  quickRow: { flexDirection: "row", gap: space.s3 },
  quickCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: space.s3 },
  quickTop: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.3 },
  quickBig: { fontSize: 30, fontWeight: "900", color: colors.maroon, marginTop: 2 },
  quickBigSm: { fontSize: 17, fontWeight: "800", color: colors.maroon, marginTop: 6 },
  quickSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  empty: { alignItems: "center", padding: space.s5, gap: space.s2 },
  emptyTitle: { color: colors.muted, fontSize: 15 },
  emptyAction: { color: colors.maroon, fontWeight: "700", fontSize: 15 },
});
