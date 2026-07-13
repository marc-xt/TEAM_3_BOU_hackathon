// Visual loan progression — repayment progress + time-to-due as bars, with big
// amounts and icons, so it reads at a glance (not just words). Inclusive by design.

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { StoredLoan } from "../domain/types";
import { colors, space, radius, fmtUGX, daysLeft } from "../theme";

export default function LoanProgress({ loan }: { loan: StoredLoan }) {
  const { t } = useTranslation();
  const total = Math.max(1, loan.total_repayable);
  const paid = Math.max(0, loan.repaid);
  const paidPct = Math.max(0, Math.min(100, Math.round((paid / total) * 100)));

  const term = loan.term_days ?? null;
  const left = daysLeft(loan.due_date);
  const timePct =
    term && term > 0 && left !== null ? Math.max(0, Math.min(100, Math.round(((term - Math.max(0, left)) / term) * 100))) : null;
  const overdue = left !== null && left < 0 && !loan.is_repaid;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("progress.title")}</Text>

      {/* Money progress */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${paidPct}%`, backgroundColor: colors.stable }]} />
        {paidPct > 8 ? <Text style={styles.pctInside}>{paidPct}%</Text> : null}
      </View>
      <View style={styles.amounts}>
        <View>
          <Text style={styles.amtLabel}>✅ {t("progress.paid")}</Text>
          <Text style={[styles.amt, { color: colors.stable }]}>{fmtUGX(paid)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.amtLabel}>💰 {t("progress.left")}</Text>
          <Text style={[styles.amt, { color: colors.maroon }]}>{fmtUGX(loan.is_repaid ? 0 : loan.outstanding)}</Text>
        </View>
      </View>

      {loan.is_repaid ? (
        <Text style={styles.done}>{t("progress.done")}</Text>
      ) : timePct !== null ? (
        <View style={styles.timeWrap}>
          <View style={styles.timeTrack}>
            <View style={[styles.timeFill, { width: `${timePct}%`, backgroundColor: overdue ? colors.high : colors.emerging }]} />
          </View>
          <Text style={[styles.timeLabel, overdue && { color: colors.high }]}>
            {overdue ? `⏰ ${t("progress.overdue")}` : `⏰ ${t("progress.daysLeft", { n: left })}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: space.s3, gap: space.s2 },
  title: { fontSize: 14, fontWeight: "800", color: colors.text },
  track: { height: 22, borderRadius: 11, backgroundColor: "#eee4d3", overflow: "hidden", justifyContent: "center" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 11 },
  pctInside: { color: "#fff", fontSize: 12, fontWeight: "800", marginLeft: 10 },
  amounts: { flexDirection: "row", justifyContent: "space-between" },
  amtLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  amt: { fontSize: 18, fontWeight: "800", marginTop: 1 },
  timeWrap: { marginTop: space.s1, gap: 4 },
  timeTrack: { height: 8, borderRadius: 4, backgroundColor: "#eee4d3", overflow: "hidden" },
  timeFill: { height: 8, borderRadius: 4 },
  timeLabel: { fontSize: 12, color: colors.muted, fontWeight: "700" },
  done: { fontSize: 14, fontWeight: "800", color: colors.stable, textAlign: "center", marginTop: space.s1 },
});
