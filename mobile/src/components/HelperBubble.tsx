// Floating "talk to me" bubble present on every screen. Opens the AI helper.
// Mounted once in App.tsx over the navigator; navigation is done via a ref.

import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";

export default function HelperBubble({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(0)).current;

  // Gentle attention pulse so people notice they can talk to Sente.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(1400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={t("bubble.label")}>
        <View style={styles.tip}>
          <Text style={styles.tipTitle}>{t("bubble.hello")} 👋</Text>
          <Text style={styles.tipSub}>{t("bubble.label")}</Text>
        </View>
        <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
          <Text style={styles.fabIcon}>💬</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 14, bottom: 22, alignItems: "flex-end" },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  tip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tipTitle: { color: colors.text, fontWeight: "800", fontSize: 12.5 },
  tipSub: { color: colors.muted, fontSize: 10.5, marginTop: 1 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.maroon,
    borderWidth: 3,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.maroon,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  fabIcon: { fontSize: 25 },
});
