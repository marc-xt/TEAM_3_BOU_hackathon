import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { reviewTc, type TcResult } from "../ai/stub";
import { SAMPLE_TC } from "../data/sampleTc";
import { colors, space, radius } from "../theme";

const VERDICT: Record<TcResult["verdict"], { fg: string; bg: string }> = {
  SAFE: { fg: colors.stable, bg: colors.stableBg },
  CAUTION: { fg: colors.emerging, bg: colors.emergingBg },
  PREDATORY: { fg: colors.high, bg: colors.highBg },
};

export default function TcReviewScreen() {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TcResult | null>(null);

  async function analyse() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      setResult(await reviewTc(text));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lede}>{t("tc.lede")}</Text>

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={t("tc.placeholder")}
        placeholderTextColor={colors.muted}
        multiline
      />
      <View style={styles.row}>
        <Pressable style={styles.ghost} onPress={() => setText(SAMPLE_TC)}>
          <Text style={styles.ghostText}>{t("tc.loadSample")}</Text>
        </Pressable>
        <Pressable style={[styles.primary, (!text.trim() || busy) && styles.disabled]} onPress={analyse}>
          <Text style={styles.primaryText}>{t("tc.analyse")}</Text>
        </Pressable>
      </View>

      {busy ? (
        <View style={styles.analysing}>
          <ActivityIndicator color={colors.maroon} />
          <Text style={styles.analysingText}>{t("tc.analysing")}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.result}>
          <View style={[styles.verdict, { backgroundColor: VERDICT[result.verdict].bg }]}>
            <Text style={[styles.verdictText, { color: VERDICT[result.verdict].fg }]}>
              {t(`tc.verdict.${result.verdict}`)}
            </Text>
          </View>
          <Text style={styles.summary}>{t(result.summaryKey)}</Text>
          <Text style={styles.flagsHead}>{t("tc.redFlags")}</Text>
          {result.red_flags.map((f, i) => (
            <View key={i} style={styles.flag}>
              <Text style={styles.flagClause}>⚠ {t(f.clauseKey)}</Text>
              <Text style={styles.flagWhy}>{t(f.whyKey)}</Text>
            </View>
          ))}
          <Text style={styles.note}>{t("tc.stubNote")}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: space.s3, gap: space.s3 },
  lede: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  input: {
    minHeight: 120,
    maxHeight: 200,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: space.s3,
    color: colors.text,
    fontSize: 13,
    textAlignVertical: "top",
  },
  row: { flexDirection: "row", gap: space.s2 },
  ghost: { flex: 1, borderWidth: 1, borderColor: colors.gold, borderRadius: 10, paddingVertical: space.s3, alignItems: "center" },
  ghostText: { color: colors.maroonDark, fontWeight: "700" },
  primary: { flex: 1, backgroundColor: colors.maroon, borderRadius: 10, paddingVertical: space.s3, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  analysing: { flexDirection: "row", alignItems: "center", gap: space.s2, justifyContent: "center", paddingVertical: space.s3 },
  analysingText: { color: colors.muted, fontStyle: "italic" },
  result: { gap: space.s2 },
  verdict: { alignSelf: "flex-start", paddingHorizontal: space.s3, paddingVertical: 8, borderRadius: 20 },
  verdictText: { fontWeight: "900", fontSize: 14, letterSpacing: 0.3 },
  summary: { color: colors.text, fontSize: 14.5, lineHeight: 21, fontWeight: "600" },
  flagsHead: { color: colors.maroon, fontWeight: "800", fontSize: 14, marginTop: space.s2 },
  flag: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.high, borderRadius: 10, padding: space.s3 },
  flagClause: { color: colors.text, fontWeight: "700", fontSize: 13 },
  flagWhy: { color: colors.muted, fontSize: 12.5, marginTop: 3, lineHeight: 18 },
  note: { color: colors.muted, fontSize: 11, fontStyle: "italic", marginTop: space.s2 },
});
