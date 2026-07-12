// App lock via device biometrics / PIN (expo-local-authentication). Prompts on
// cold launch and on resume after 2+ minutes in the background — the SenteCheck
// rule. Toggle + timeout persisted in Settings.

import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ENABLED_KEY = "cs.lock.enabled";
const TIMEOUT_KEY = "cs.lock.timeoutMin";
const DEFAULT_TIMEOUT_MIN = 2;

export async function isLockEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) !== "false"; // default ON
}
export async function setLockEnabled(v: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, String(v));
}
export async function getLockTimeoutMin(): Promise<number> {
  const v = await AsyncStorage.getItem(TIMEOUT_KEY);
  return v ? parseInt(v, 10) : DEFAULT_TIMEOUT_MIN;
}
export async function setLockTimeoutMin(min: number): Promise<void> {
  await AsyncStorage.setItem(TIMEOUT_KEY, String(min));
}

export async function canUseDeviceAuth(): Promise<boolean> {
  const hasHw = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHw && enrolled;
}

// Returns true if the app should be unlocked (auth succeeded, or lock disabled,
// or the device has no enrolled auth so we don't hard-block).
export async function authenticate(promptMessage: string): Promise<boolean> {
  if (!(await isLockEnabled())) return true;
  if (!(await canUseDeviceAuth())) return true; // no-lock-screen: warn elsewhere, don't block
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
  return res.success;
}

// Given the timestamp the app was last backgrounded, should we re-prompt?
export async function shouldRelock(lastBackgroundedAt: number | null): Promise<boolean> {
  if (lastBackgroundedAt === null) return false;
  const timeoutMs = (await getLockTimeoutMin()) * 60 * 1000;
  return Date.now() - lastBackgroundedAt >= timeoutMs;
}
