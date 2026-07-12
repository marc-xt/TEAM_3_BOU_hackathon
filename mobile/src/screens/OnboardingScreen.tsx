import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { SUPPORTED, setLanguage } from "../i18n";
import { requestSmsPermission } from "../sms/reader";
import { ensureNotifPermission } from "../notify/scheduler";
import { colors, space, radius } from "../theme";

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language);

  async function chooseLang(code: string) {
    setLang(code);
    await setLanguage(code);
  }

  async function grant() {
    await requestSmsPermission();
    await ensureNotifPermission();
    onDone();
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>{t("app.title")}</Text>
      <Text style={styles.title}>{t("onboarding.consentTitle")}</Text>
      <Text style={styles.body}>{t("onboarding.consentBody")}</Text>

      <Text style={styles.label}>{t("onboarding.language")}</Text>
      <View style={styles.chips}>
        {SUPPORTED.map((s) => (
          <Pressable key={s.code} onPress={() => chooseLang(s.code)} style={[styles.chip, lang === s.code && styles.chipOn]}>
            <Text style={[styles.chipText, lang === s.code && styles.chipTextOn]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <Pressable style={styles.primary} onPress={grant}>
        <Text style={styles.primaryText}>{t("onboarding.grantSms")}</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onDone}>
        <Text style={styles.secondaryText}>{t("onboarding.continue")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, padding: space.s4, paddingTop: space.s5 * 2 },
  brand: { color: colors.maroon, fontSize: 22, fontWeight: "800" },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: space.s4 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: space.s3 },
  label: { color: colors.text, fontWeight: "700", marginTop: space.s5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.s2, marginTop: space.s2 },
  chip: { paddingHorizontal: space.s3, paddingVertical: space.s2, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  primary: { backgroundColor: colors.maroon, borderRadius: radius, padding: space.s4, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondary: { padding: space.s3, alignItems: "center", marginTop: space.s2 },
  secondaryText: { color: colors.muted, fontWeight: "600" },
});
