import { STRESS_BAND_META } from "../constants";
import StressBadge from "./StressBadge";

// Plain-language nudge tied to the stress band. The copy lives in STRESS_BAND_META so
// it is defined once and reused, never re-typed as literals here.
export default function AlertBanner({ band, reason }) {
  const meta = STRESS_BAND_META[band];
  if (!meta) return null;
  return (
    <section className={`alert-banner alert-banner--${meta.tone}`} aria-live="polite">
      <div className="alert-banner__header">
        <StressBadge band={band} />
        <h2 className="alert-banner__headline">{meta.headline}</h2>
      </div>
      <p className="alert-banner__nudge">{meta.nudge}</p>
      {reason ? <p className="alert-banner__reason">{reason}</p> : null}
    </section>
  );
}
