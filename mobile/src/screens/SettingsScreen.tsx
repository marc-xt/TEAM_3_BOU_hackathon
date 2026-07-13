import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Switch, Pressable, TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUPPORTED, setLanguage } from "../i18n";
import { isLockEnabled, setLockEnabled, getLockTimeoutMin, setLockTimeoutMin } from "../lock/appLock";
import { getApiBase, setApiBase, getBorrowerId, setBorrowerId } from "../api/client";
import { hasSmsPermission, requestSmsPermission } from "../sms/reader";
import { useApp } from "../state/context";
import { colors, space, radius } from "../theme";

const PREF_DUE = "cs.pref.dueReminders";
const PREF_RISING = "cs.pref.risingAlerts";

export default function SettingsScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { refresh, injectSamples, exitSamples, sampleMode } = useApp();
  const [lang, setLang] = useState(i18n.language);
  const [lock, setLock] = useState(true);
  const [timeout, setTimeoutMin] = useState(2);
  const [due, setDue] = useState(true);
  const [rising, setRising] = useState(true);
  const [apiBase, setBase] = useState("");
  const [borrowerId, setBid] = useState("1");
  const [sms, setSms] = useState(false);

  useEffect(() => {
    (async () => {
      setLock(await isLockEnabled());
      setTimeoutMin(await getLockTimeoutMin());
      setDue((await AsyncStorage.getItem(PREF_DUE)) !== "false");
      setRising((await AsyncStorage.getItem(PREF_RISING)) !== "false");
      setBase(await getApiBase());
      setBid(String(await getBorrowerId()));
      setSms(await hasSmsPermission());
    })();
  }, []);

  async function chooseLang(code: string) {
    setLang(code);
    await setLanguage(code);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Section title={t("settings.language")}>
        <View style={styles.chips}>
          {SUPPORTED.map((s) => (
            <Pressable key={s.code} onPress={() => chooseLang(s.code)} style={[styles.chip, lang === s.code && styles.chipOn]}>
              <Text style={[styles.chipText, lang === s.code && styles.chipTextOn]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={t("settings.tools")}>
        <Pressable style={styles.navRow} onPress={() => navigation.navigate("TcReview")}>
          <Text style={styles.navRowText}>📄  {t("settings.checkTerms")}</Text>
          <Text style={styles.navChevron}>›</Text>
        </Pressable>
        <Pressable style={styles.navRow} onPress={() => navigation.navigate("Chat")}>
          <Text style={styles.navRowText}>💬  {t("settings.talkToSente")}</Text>
          <Text style={styles.navChevron}>›</Text>
        </Pressable>
      </Section>

      <Section title={t("settings.appLock")}>
        <ToggleRow
          label={t("settings.appLockDesc")}
          value={lock}
          onChange={async (v) => { setLock(v); await setLockEnabled(v); }}
        />
        <View style={styles.chips}>
          {[1, 2, 5].map((m) => (
            <Pressable key={m} onPress={async () => { setTimeoutMin(m); await setLockTimeoutMin(m); }} style={[styles.chip, timeout === m && styles.chipOn]}>
              <Text style={[styles.chipText, timeout === m && styles.chipTextOn]}>{m} min</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={t("settings.notifications")}>
        <ToggleRow label={t("settings.dueReminders")} value={due} onChange={async (v) => { setDue(v); await AsyncStorage.setItem(PREF_DUE, String(v)); }} />
        <ToggleRow label={t("settings.risingAlerts")} value={rising} onChange={async (v) => { setRising(v); await AsyncStorage.setItem(PREF_RISING, String(v)); }} />
      </Section>

      <Section title={t("settings.backend")}>
        <Text style={styles.fieldLabel}>{t("settings.apiBase")}</Text>
        <TextInput style={styles.input} value={apiBase} onChangeText={setBase} autoCapitalize="none" placeholder="http://192.168.x.x:8000/api" />
        <Text style={styles.fieldLabel}>{t("settings.borrowerId")}</Text>
        <TextInput style={styles.input} value={borrowerId} onChangeText={setBid} keyboardType="number-pad" />
        <Pressable style={styles.saveBtn} onPress={async () => { await setApiBase(apiBase); await setBorrowerId(parseInt(borrowerId, 10) || 1); await refresh(); }}>
          <Text style={styles.saveText}>{t("settings.save")}</Text>
        </Pressable>
      </Section>

      <Section title={t("settings.permissions")}>
        <Text style={[styles.status, sms ? styles.ok : styles.bad]}>
          {sms ? t("settings.smsGranted") : t("settings.smsDenied")}
        </Text>
        {!sms && (
          <Pressable style={styles.saveBtn} onPress={async () => { const g = await requestSmsPermission(); setSms(g); if (g) await refresh(); }}>
            <Text style={styles.saveText}>{t("settings.grantSms")}</Text>
          </Pressable>
        )}
        {sampleMode ? (
          <>
            <Text style={[styles.status, { color: colors.emerging }]}>Showing sample data</Text>
            <Pressable style={styles.saveBtn} onPress={exitSamples}>
              <Text style={styles.saveText}>Return to live data</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.demoBtn} onPress={injectSamples}>
            <Text style={styles.demoText}>Load sample loans (demo)</Text>
          </Pressable>
        )}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.maroon }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { padding: space.s3, gap: space.s3 },
  section: { backgroundColor: colors.surface, borderRadius: radius, padding: space.s3, borderWidth: 1, borderColor: colors.border, gap: space.s2 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.maroon, marginBottom: space.s1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.s2 },
  chip: { paddingHorizontal: space.s3, paddingVertical: space.s2, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cream },
  chipOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s3 },
  toggleLabel: { color: colors.text, fontSize: 14, flex: 1 },
  fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: "600", marginTop: space.s1 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: space.s2, color: colors.text, backgroundColor: colors.cream },
  saveBtn: { backgroundColor: colors.maroon, borderRadius: 8, padding: space.s3, alignItems: "center", marginTop: space.s2 },
  saveText: { color: "#fff", fontWeight: "700" },
  demoBtn: { borderWidth: 1, borderColor: colors.gold, borderRadius: 8, padding: space.s3, alignItems: "center", marginTop: space.s2 },
  demoText: { color: colors.maroonDark, fontWeight: "700" },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.s2 },
  navRowText: { color: colors.text, fontSize: 14.5, fontWeight: "600" },
  navChevron: { color: colors.muted, fontSize: 20 },
  status: { fontSize: 14, fontWeight: "600" },
  ok: { color: colors.stable },
  bad: { color: colors.high },
});
