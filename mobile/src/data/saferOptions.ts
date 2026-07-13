// Curated safer ways to get cash — shown when a borrower is under pressure.
// i18n keys so it's translatable; copy lives in the locale files under "safer".

export interface SaferOption {
  icon: string;
  titleKey: string;
  descKey: string;
  saveKey?: string;
}

export const SAFER_OPTIONS: SaferOption[] = [
  { icon: "✓", titleKey: "safer.licensed.t", descKey: "safer.licensed.d", saveKey: "safer.licensed.s" },
  { icon: "👥", titleKey: "safer.sacco.t", descKey: "safer.sacco.d" },
  { icon: "⏳", titleKey: "safer.less.t", descKey: "safer.less.d" },
  { icon: "🤝", titleKey: "safer.wait.t", descKey: "safer.wait.d" },
];
