// Borrowing-health banner — band badge + plain-language headline/nudge.
// Ports the web AlertBanner + STRESS_BAND_META copy (now in i18n).

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { HealthResult } from "../domain/health";
import { colors, space, radius, bandTone } from "../theme";

export default function HealthBanner({ health }: { health: HealthResult }) {
  const { t } = useTranslation();
  const tone = bandTone(health.band);
  return (
    <View style={[styles.banner, { backgroundColor: tone.bg }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.badge, { color: "#fff", backgroundColor: tone.fg }]}>{health.band}</Text>
        <Text style={[styles.headline, { color: tone.fg }]}>{t(`health.${health.band}.headline`)}</Text>
      </View>
      <Text style={styles.nudge}>{t(`health.${health.band}.nudge`)}</Text>
      {health.reason ? <Text style={styles.reason}>{health.reason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius, padding: space.s3 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: space.s2, marginBottom: space.s2, flexWrap: "wrap" },
  badge: {
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: space.s2,
    paddingVertical: space.s1,
    borderRadius: 8,
    overflow: "hidden",
  },
  headline: { fontSize: 16, fontWeight: "700", flexShrink: 1 },
  nudge: { color: colors.text, fontSize: 14, lineHeight: 20 },
  reason: { color: colors.muted, fontSize: 13, marginTop: space.s2, lineHeight: 18 },
});
