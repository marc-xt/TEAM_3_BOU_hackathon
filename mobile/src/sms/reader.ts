// Real device inbox reading (Android only). Requests SMS permission, reads the
// inbox, and runs each body through the on-device parser. Guarded by Platform
// so JS-only surfaces (Settings, onboarding) still work on iOS / web.

import { PermissionsAndroid, Platform } from "react-native";
import SmsAndroid from "react-native-get-sms-android";
import { parseSms } from "./parser";
import type { ParsedEntry } from "../domain/types";

export async function hasSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const res = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  ]);
  return res[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
}

interface RawSms {
  body: string;
  date: number; // epoch ms
  address: string;
}

// Read the inbox and return every SMS that parsed as a loan event (oldest first,
// so disbursement→terms merges and repayments apply in order).
export async function readLoanSms(maxCount = 500): Promise<ParsedEntry[]> {
  if (Platform.OS !== "android" || !SmsAndroid?.list) return [];
  // Must not query the SMS provider without permission: the native module
  // throws a Java SecurityException on its own thread that JS can't catch and
  // that hard-crashes the app. Only read once READ_SMS is actually granted.
  if (!(await hasSmsPermission())) return [];
  const filter = JSON.stringify({ box: "inbox", maxCount });
  const list: RawSms[] = await new Promise((resolve) => {
    try {
      SmsAndroid.list(
        filter,
        () => resolve([]),
        (_count: number, smsListJson: string) => {
          try {
            resolve(JSON.parse(smsListJson) as RawSms[]);
          } catch {
            resolve([]);
          }
        }
      );
    } catch {
      resolve([]);
    }
  });

  const entries: ParsedEntry[] = [];
  for (const sms of list) {
    const parsed = parseSms(sms.body, sms.date);
    if (parsed) entries.push(parsed);
  }
  return entries.sort((a, b) => a.received_at - b.received_at);
}
