import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, AppState, StyleSheet, ActivityIndicator } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { initI18n } from "./i18n";
import { AppProvider } from "./state/context";
import HomeScreen from "./screens/HomeScreen";
import LoanDetailScreen from "./screens/LoanDetailScreen";
import SettingsScreen from "./screens/SettingsScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import ChatScreen from "./screens/ChatScreen";
import HelperBubble from "./components/HelperBubble";
import { authenticate, shouldRelock } from "./lock/appLock";
import { colors } from "./theme";

const ONBOARDED_KEY = "cs.onboarded";
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function openChat(params?: object) {
  if (navigationRef.isReady()) (navigationRef.navigate as any)("Chat", params);
}

const navTheme = {
  dark: false,
  colors: {
    primary: colors.maroon,
    background: colors.cream,
    card: colors.maroon,
    text: "#fff",
    border: colors.maroonDark,
    notification: colors.gold,
  },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [locked, setLocked] = useState(true);
  const lastBg = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      await initI18n();
      setOnboarded((await AsyncStorage.getItem(ONBOARDED_KEY)) === "true");
      const ok = await authenticate("Unlock BorrowWise");
      setLocked(!ok);
      setReady(true);
    })();
  }, []);

  // Re-lock after 2+ min in background (SenteCheck rule).
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "background" || state === "inactive") {
        lastBg.current = Date.now();
      } else if (state === "active" && (await shouldRelock(lastBg.current))) {
        setLocked(true);
        const ok = await authenticate("Unlock BorrowWise");
        setLocked(!ok);
      }
    });
    return () => sub.remove();
  }, []);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.maroon} />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <AppProvider>
        <StatusBar style="dark" />
        <OnboardingScreen
          onDone={async () => {
            await AsyncStorage.setItem(ONBOARDED_KEY, "true");
            setOnboarded(true);
          }}
        />
      </AppProvider>
    );
  }

  if (locked) {
    return (
      <View style={styles.center}>
        <Text style={styles.lockTitle}>BorrowWise</Text>
        <Pressable style={styles.unlock} onPress={async () => setLocked(!(await authenticate("Unlock BorrowWise")))}>
          <Text style={styles.unlockText}>Unlock</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <AppProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef} theme={navTheme as any}>
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={({ navigation }) => ({
                title: "BorrowWise",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Settings")} hitSlop={12}>
                    <Text style={styles.gear}>⚙︎</Text>
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen name="LoanDetail" component={LoanDetailScreen} options={{ title: "Loan" }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Sente · helper" }} />
          </Stack.Navigator>
        </NavigationContainer>
        <HelperBubble onPress={() => openChat()} />
      </View>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream, gap: 24 },
  lockTitle: { color: colors.maroon, fontSize: 26, fontWeight: "800" },
  unlock: { backgroundColor: colors.maroon, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  unlockText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  gear: { color: "#fff", fontSize: 22 },
});
