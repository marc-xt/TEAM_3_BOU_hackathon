import { STRESS_BAND_META } from "../constants";

// Colour-coded pill for the borrower's stress band. Render-only.
export default function StressBadge({ band }) {
  const meta = STRESS_BAND_META[band];
  if (!meta) return null;
  return (
    <span className={`stress-badge stress-badge--${meta.tone}`} role="status">
      <span className="stress-badge__dot" aria-hidden="true" />
      {band}
    </span>
  );
}
