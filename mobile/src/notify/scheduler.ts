// Local notifications: due-date reminders (3 days + 1 day before) and a
// "borrowing climbing" alert when the total outstanding rises. Uses
// expo-notifications; all scheduling is local (no push server, stays offline).

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { StoredLoan } from "../domain/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotifPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("loans", {
      name: "Loan reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

const DAYS_BEFORE = [3, 1];

// Reschedule all due reminders from scratch (idempotent). Call after each refresh.
export async function scheduleDueReminders(loans: StoredLoan[], fmtAmount: (n: number) => string): Promise<void> {
  await setupAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const active = loans.filter((l) => l.kind === "DISBURSEMENT" && !l.is_repaid && l.due_date);
  for (const loan of active) {
    const due = Date.parse(loan.due_date + "T09:00:00");
    if (Number.isNaN(due)) continue;
    for (const d of DAYS_BEFORE) {
      const when = due - d * 24 * 60 * 60 * 1000;
      if (when <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${loan.lender} repayment due in ${d} day${d > 1 ? "s" : ""}`,
          body: `You owe ${fmtAmount(loan.outstanding)}. Due ${loan.due_date}.`,
        },
        trigger: { date: new Date(when), channelId: "loans" } as any,
      });
    }
  }
}

// Immediate "borrowing climbing" alert.
export async function notifyRising(totalOutstanding: number, fmtAmount: (n: number) => string): Promise<void> {
  await setupAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Your borrowing is climbing",
      body: `Total outstanding is now ${fmtAmount(totalOutstanding)}. Consider pausing new loans.`,
    },
    trigger: null, // fire now
  });
}

// High-urgency "dangerous app" channel — MAX importance so it heads-up over
// whatever's on screen. Deliberately prominent, not a quiet tray note.
async function setupSecurityChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("security", {
      name: "Loan-app safety alerts",
      importance: Notifications.AndroidImportance.MAX,
      lightColor: "#c0271d",
      vibrationPattern: [0, 400, 200, 400],
      bypassDnd: true,
    });
  }
}

// Urgent, expressive alert that a flagged/regulated lender app is on the device.
export async function notifyBannedApp(appName: string, reason: string): Promise<void> {
  await setupSecurityChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ Risky loan app detected: ${appName}`,
      body: `${reason} Tap to understand the danger and how to remove it.`,
      color: "#c0271d",
      priority: Notifications.AndroidNotificationPriority.MAX,
      vibrate: [0, 400, 200, 400],
    },
    trigger: null,
  });
}
