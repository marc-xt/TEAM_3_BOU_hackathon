// Presentation helpers kept out of components so components stay render-only (§8.2).
import { CURRENCY_DEFAULT } from "./constants";

export function formatCurrency(amount, currency = CURRENCY_DEFAULT) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "—";
  }
  return `${currency} ${Number(amount).toLocaleString("en-UG")}`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
