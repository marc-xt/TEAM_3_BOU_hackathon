import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/context";
import { estimateMonthlyIncome, computeScore } from "../domain/insights";
import { SAMPLE_TRANSACTIONS } from "../data/sampleTransactions";
import { colors, space, radius } from "../theme";

function bandTone(bandKey: string) {
  if (bandKey.endsWith("risk")) return { fg: colors.high, bg: colors.highBg };
  if (bandKey.endsWith("fair")) return { fg: colors.emerging, bg: colors.emergingBg };
  return { fg: colors.stable, bg: colors.stableBg };
}

export default function ScoreScreen() {
  const { t } = useTranslation();
  const { loans } = useApp();
  const income = estimateMonthlyIncome(SAMPLE_TRANSACTIONS);
  const { score, bandKey, factors } = computeScore(income, loans);
  const tone = bandTone(bandKey);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.gaugeCard}>
        <Text style={[styles.score, { color: colors.maroon }]}>{score}</Text>
        <Text style={styles.outOf}>{t("score.outOf")}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${score}%`, backgroundColor: tone.fg }]} />
        </View>
        <Text style={[styles.band, { color: tone.fg }]}>{t(bandKey)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h3}>{t("score.builtTitle")}</Text>
        <View style={{ gap: space.s2, marginTop: space.s2 }}>
          {factors.map((f) => (
            <View key={f.key} style={styles.factor}>
              <View style={[styles.mark, { backgroundColor: f.ok ? colors.stable : colors.emerging }]}>
                <Text style={styles.markText}>{f.ok ? "✓" : "!"}</Text>
              </View>
              <Text style={styles.factorText}>{t(f.key)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.privacy}>
        <Text style={styles.privacyText}>🔒 {t("score.privacy")}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: space.s3, gap: space.s3 },
  gaugeCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: space.s4, alignItems: "center" },
  score: { fontSize: 56, fontWeight: "900", lineHeight: 60 },
  outOf: { color: colors.muted, fontSize: 13, marginTop: -2 },
  track: { width: "100%", height: 12, borderRadius: 6, backgroundColor: "#e7e0d3", marginTop: space.s3, overflow: "hidden" },
  fill: { height: 12, borderRadius: 6 },
  band: { fontSize: 16, fontWeight: "800", marginTop: space.s2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: space.s3 },
  h3: { fontSize: 14, fontWeight: "800", color: colors.text },
  factor: { flexDirection: "row", alignItems: "center", gap: space.s2 },
  mark: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  markText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  factorText: { flex: 1, color: colors.text, fontSize: 13 },
  privacy: { backgroundColor: colors.stableBg, borderRadius: 10, padding: space.s3 },
  privacyText: { color: "#0b4f32", fontSize: 12.5, lineHeight: 18 },
});
