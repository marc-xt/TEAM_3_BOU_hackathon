// Full-screen intercept overlay for a flagged app. Reversed dark pattern:
// the safe "Understand more & get help" is big and warm and routes to the AI
// helper; "continue anyway" is a tiny, faint link.

import React from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useApp } from "../state/context";
import { colors, space } from "../theme";

export default function DangerOverlay({ onUnderstand }: { onUnderstand: (app: string) => void }) {
  const { t } = useTranslation();
  const { dangerApp, hideDanger } = useApp();
  const app = dangerApp;

  return (
    <Modal visible={!!app} transparent animationType="fade" onRequestClose={hideDanger}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <Text style={styles.brand}>🛡️  {t("danger.brand")}</Text>
          <ScrollView contentContainerStyle={{ gap: space.s2 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{t("danger.title", { app: app ?? "" })}</Text>
            <Text style={styles.reg}>{t("danger.reg")}</Text>
            <View style={styles.flags}>
              {["danger.f1", "danger.f2", "danger.f3"].map((k) => (
                <View key={k} style={styles.flagRow}>
                  <Text style={styles.x}>✕</Text>
                  <Text style={styles.flagText}>{t(k)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <Pressable
            style={styles.primary}
            onPress={() => { const a = app ?? ""; hideDanger(); onUnderstand(a); }}
          >
            <Text style={styles.primaryText}>{t("danger.understand")}</Text>
            <Text style={styles.primarySub}>{t("danger.understandSub")} →</Text>
          </Pressable>

          <Pressable style={styles.ghost} onPress={hideDanger} hitSlop={6}>
            <Text style={styles.ghostText}>{t("danger.continue", { app: app ?? "" })}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(9,7,11,0.74)", justifyContent: "flex-end", padding: 12 },
  card: { backgroundColor: colors.high, borderRadius: 22, borderWidth: 2, borderColor: "#8f1c14", padding: 18, maxHeight: "88%" },
  brand: { color: "#ffdad5", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  title: { color: "#fff", fontSize: 21, fontWeight: "900", marginTop: 8, lineHeight: 26 },
  reg: { color: "#fff", backgroundColor: "#8f1c14", alignSelf: "flex-start", fontSize: 11, fontWeight: "700", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7, overflow: "hidden" },
  flags: { gap: 8, marginTop: 4 },
  flagRow: { flexDirection: "row", gap: 8 },
  x: { color: "#ffd7d2", fontWeight: "900" },
  flagText: { color: "#fff", fontSize: 13, lineHeight: 18, flex: 1 },
  primary: { backgroundColor: "#fff", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  primaryText: { color: colors.high, fontWeight: "900", fontSize: 16 },
  primarySub: { color: "#8f1c14", fontWeight: "700", fontSize: 11.5, marginTop: 3 },
  ghost: { alignItems: "center", paddingVertical: 12, marginTop: 2 },
  ghostText: { color: "#e79b95", fontSize: 11, textDecorationLine: "underline", opacity: 0.8 },
});
