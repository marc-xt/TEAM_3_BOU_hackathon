import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, space, radius } from "../theme";

interface Report {
  icon: string;
  label: string;
}

export default function ContributionScreen() {
  const { t } = useTranslation();
  // What the borrower has chosen to send (seeded for the demo).
  const [reports, setReports] = useState<Report[]>([
    { icon: "🚩", label: t("contrib.flagged", { app: "Ezee Credit" }) },
    { icon: "📝", label: t("contrib.reported") },
  ]);
  const [count, setCount] = useState(4238);

  function reportDemo() {
    setReports((r) => [{ icon: "🚩", label: t("contrib.flagged", { app: "QuickCash UG" }) }, ...r]);
    setCount((c) => c + 1);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.contrib}>
        <Text style={styles.contribN}>{count.toLocaleString("en-UG")}</Text>
        <Text style={styles.contribL}>{t("contrib.countSub")} 🙌</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h3}>{t("contrib.sentTitle")}</Text>
        <Text style={styles.sub}>{t("contrib.sentSub")}</Text>
        <View style={{ gap: space.s2, marginTop: space.s2 }}>
          {reports.map((r, i) => (
            <View key={i} style={styles.sentRow}>
              <Text style={styles.sentLabel}>{r.icon}  {r.label}</Text>
              <Text style={styles.view}>{t("contrib.view")} ›</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.reportBtn} onPress={reportDemo}>
          <Text style={styles.reportText}>{t("contrib.reportBtn")}</Text>
        </Pressable>
      </View>

      <View style={styles.shareCard}>
        <Text style={[styles.h3, { color: colors.stable }]}>{t("contrib.shareTitle")}</Text>
        <View style={{ gap: 5, marginTop: space.s2 }}>
          <Text style={styles.shareItem}>• {t("contrib.share1")}</Text>
          <Text style={styles.shareItem}>• {t("contrib.share2")}</Text>
          <Text style={styles.shareItem}>• {t("contrib.share3")}</Text>
        </View>
      </View>

      <View style={styles.noid}>
        <Text style={styles.noidText}>{t("contrib.privacy")}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: space.s3, gap: space.s3 },
  contrib: { backgroundColor: colors.maroon, borderRadius: radius, padding: space.s4 },
  contribN: { color: "#fff", fontSize: 32, fontWeight: "900" },
  contribL: { color: colors.gold, fontSize: 13, marginTop: 2, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: space.s3 },
  h3: { fontSize: 14, fontWeight: "800", color: colors.text },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  sentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10 },
  sentLabel: { color: colors.text, fontSize: 12.5, fontWeight: "700", flex: 1 },
  view: { color: colors.muted, fontSize: 12 },
  reportBtn: { borderWidth: 1, borderColor: colors.gold, borderRadius: 8, paddingVertical: space.s2, alignItems: "center", marginTop: space.s2 },
  reportText: { color: colors.maroonDark, fontWeight: "700", fontSize: 13 },
  shareCard: { backgroundColor: colors.stableBg, borderWidth: 1, borderColor: "#bfe0cd", borderRadius: radius, padding: space.s3 },
  shareItem: { color: "#0b4f32", fontSize: 12.5, lineHeight: 18 },
  noid: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", borderRadius: 10, padding: space.s3 },
  noidText: { color: colors.muted, fontSize: 11.5, lineHeight: 17 },
});
