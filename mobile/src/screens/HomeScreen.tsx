import React from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/context";
import HealthBanner from "../components/HealthBanner";
import LoanCard from "../components/LoanCard";
import { colors, space, fmtUGX } from "../theme";
import { summarize } from "../domain/health";

export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { loans, health, refreshing, rising, refresh } = useApp();
  const active = loans.filter((l) => !l.is_repaid);
  const total = summarize(loans).totalOutstanding;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={active}
      keyExtractor={(l) => l.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.maroon} />}
      ListHeaderComponent={
        <View style={{ gap: space.s3 }}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>{t("loan.outstanding")}</Text>
            <Text style={styles.totalValue}>{fmtUGX(total)}</Text>
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
  empty: { alignItems: "center", padding: space.s5, gap: space.s2 },
  emptyTitle: { color: colors.muted, fontSize: 15 },
  emptyAction: { color: colors.maroon, fontWeight: "700", fontSize: 15 },
});
