// Expressive in-app warning that a flagged/regulated lender app was detected.
// Driven by context (set by a demo trigger). Tapping through opens the full
// intercept overlay → AI rescue.

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/context";
import { colors, space, radius } from "../theme";

export default function BannedAppBanner() {
  const { t } = useTranslation();
  const { flaggedApp, clearFlagged, showDanger } = useApp();
  if (!flaggedApp) return null;

  return (
    <View style={styles.card} accessibilityRole="alert">
      <View style={styles.head}>
        <Text style={styles.title}>⚠️ {t("banned.title")}</Text>
        <Pressable onPress={clearFlagged} hitSlop={10}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.appName}>{flaggedApp.name}</Text>
      <Text style={styles.reason}>{flaggedApp.reason}</Text>
      <Pressable style={styles.action} onPress={() => { clearFlagged(); showDanger(flaggedApp.name); }}>
        <Text style={styles.actionText}>{t("banned.action")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.high, borderRadius: radius, borderWidth: 2, borderColor: "#8f1c14", padding: space.s3, gap: 6 },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { color: "#fff", fontSize: 15, fontWeight: "800", flex: 1 },
  close: { color: "#ffdad5", fontSize: 15, fontWeight: "800", paddingLeft: space.s2 },
  appName: { color: "#fff", fontSize: 17, fontWeight: "900" },
  reason: { color: "#ffe7e4", fontSize: 12.5, lineHeight: 18 },
  action: { backgroundColor: "#fff", borderRadius: 9, paddingVertical: 11, alignItems: "center", marginTop: 4 },
  actionText: { color: colors.high, fontWeight: "800", fontSize: 13.5 },
});
