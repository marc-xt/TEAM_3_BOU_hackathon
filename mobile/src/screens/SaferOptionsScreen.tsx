import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { SAFER_OPTIONS } from "../data/saferOptions";
import { colors, space, radius } from "../theme";

export default function SaferOptionsScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.empathy}>
        <Text style={styles.empathyH}>{t("safer.header")}</Text>
        <Text style={styles.empathyP}>{t("safer.sub")}</Text>
      </View>
      {SAFER_OPTIONS.map((o) => (
        <View key={o.titleKey} style={styles.opt}>
          <View style={styles.ic}><Text style={styles.icText}>{o.icon}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optTitle}>{t(o.titleKey)}</Text>
            <Text style={styles.optDesc}>{t(o.descKey)}</Text>
            {o.saveKey ? <Text style={styles.save}>{t(o.saveKey)}</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: space.s3, gap: space.s3 },
  empathy: { backgroundColor: colors.stableBg, borderRadius: radius, padding: space.s3 },
  empathyH: { fontSize: 17, fontWeight: "800", color: colors.stable },
  empathyP: { fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 19 },
  opt: { flexDirection: "row", gap: space.s3, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: space.s3 },
  ic: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.stableBg, alignItems: "center", justifyContent: "center" },
  icText: { fontSize: 18, color: colors.stable },
  optTitle: { fontSize: 14.5, fontWeight: "800", color: colors.text },
  optDesc: { fontSize: 12.5, color: colors.muted, marginTop: 2, lineHeight: 18 },
  save: { fontSize: 11, fontWeight: "700", color: colors.stable, backgroundColor: colors.stableBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6, alignSelf: "flex-start", overflow: "hidden" },
});
