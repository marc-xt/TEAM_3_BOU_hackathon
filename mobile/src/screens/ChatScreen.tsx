import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { sendChat, type ChatMessage } from "../ai/stub";
import { colors, space, radius } from "../theme";

const QUICK = ["chat.q1", "chat.q2", "chat.q3"];

export default function ChatScreen({ route }: any) {
  const { t, i18n } = useTranslation();
  const seedApp: string | undefined = route?.params?.seedApp;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollView>(null);

  // Opening message — a rescue opener if we came from the overlay, else a greeting.
  useEffect(() => {
    const opener: ChatMessage = seedApp
      ? { role: "assistant", content: t("chat.rescueOpener", { app: seedApp }) }
      : { role: "assistant", content: t("chat.greeting") };
    setMessages([opener]);
  }, [seedApp, t]);

  async function submit(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    const next = [...messages, { role: "user", content: clean } as ChatMessage];
    setMessages(next);
    setBusy(true);
    try {
      const r = await sendChat(next, i18n.language);
      setMessages((m) => [...m, { role: "assistant", content: t(r.key, r.params), cards: r.cards }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroller}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, i) => (
          <View key={i} style={{ gap: space.s2 }}>
            <View style={[styles.bubble, m.role === "user" ? styles.me : styles.bot]}>
              <Text style={m.role === "user" ? styles.meText : styles.botText}>{m.content}</Text>
            </View>
            {m.cards?.map((c, j) => (
              <View key={j} style={styles.card}>
                <Text style={styles.cardTitle}>✓ {c.name}</Text>
                <Text style={styles.cardDetail}>{c.detail}</Text>
                <Text style={styles.cardAction}>{c.action} →</Text>
              </View>
            ))}
          </View>
        ))}
        {busy ? <Text style={styles.typing}>{t("chat.typing")}</Text> : null}
      </ScrollView>

      <View style={styles.quickRow}>
        {QUICK.map((k) => (
          <Pressable key={k} style={styles.quick} onPress={() => submit(t(k))}>
            <Text style={styles.quickText}>{t(k)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t("chat.placeholder")}
          placeholderTextColor={colors.muted}
          onSubmitEditing={() => submit(input)}
          returnKeyType="send"
        />
        <Pressable style={styles.send} onPress={() => submit(input)}>
          <Text style={styles.sendText}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  list: { padding: space.s3, gap: space.s2 },
  bubble: { maxWidth: "86%", padding: 11, borderRadius: 15 },
  bot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: "flex-start", borderBottomLeftRadius: 5 },
  me: { backgroundColor: colors.maroon, alignSelf: "flex-end", borderBottomRightRadius: 5 },
  botText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  meText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: colors.stableBg, borderWidth: 1, borderColor: "#bfe0cd", borderRadius: 12, padding: 11, alignSelf: "flex-start", maxWidth: "90%" },
  cardTitle: { color: colors.stable, fontWeight: "800", fontSize: 13.5 },
  cardDetail: { color: "#0b4f32", fontSize: 12, marginTop: 2, lineHeight: 17 },
  cardAction: { color: colors.stable, fontWeight: "800", fontSize: 12, marginTop: 6 },
  typing: { color: colors.muted, fontSize: 12, fontStyle: "italic", marginLeft: space.s2 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: space.s2, paddingHorizontal: space.s3, paddingBottom: space.s2 },
  quick: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  quickText: { color: colors.maroon, fontWeight: "600", fontSize: 12 },
  inputBar: { flexDirection: "row", alignItems: "center", gap: space.s2, padding: space.s2, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: colors.text },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.maroon, alignItems: "center", justifyContent: "center" },
  sendText: { color: "#fff", fontSize: 16 },
});
