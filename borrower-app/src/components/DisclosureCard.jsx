import { formatCurrency, formatDate } from "../format";

// Renders parsed loan fields in plain language. Presentation only — all parsing and the
// predatory judgement come from the backend via the parsed payload.
export default function DisclosureCard({ disclosure }) {
  if (!disclosure) return null;

  const {
    lender,
    is_licensed: isLicensed,
    amount,
    currency,
    fees = [],
    total_repayable: totalRepayable,
    due_date: dueDate,
    term_days: termDays,
    effective_rate_pct: effectiveRatePct,
    is_predatory: isPredatory,
    flags = [],
  } = disclosure;

  return (
    <article
      className={`disclosure-card ${isPredatory ? "disclosure-card--predatory" : ""}`}
      aria-label="Loan disclosure"
    >
      <header className="disclosure-card__header">
        <div>
          <h2 className="disclosure-card__lender">{lender}</h2>
          <span
            className={`disclosure-card__licence ${
              isLicensed ? "is-licensed" : "is-unlicensed"
            }`}
          >
            {isLicensed ? "Licensed lender" : "Not a licensed lender"}
          </span>
        </div>
        {isPredatory ? (
          <span className="disclosure-card__flag" role="alert">
            High-cost loan
          </span>
        ) : null}
      </header>

      <dl className="disclosure-card__grid">
        <div className="disclosure-card__row">
          <dt>You receive</dt>
          <dd>{formatCurrency(amount, currency)}</dd>
        </div>
        <div className="disclosure-card__row">
          <dt>You repay</dt>
          <dd className="disclosure-card__total">
            {formatCurrency(totalRepayable, currency)}
          </dd>
        </div>
        {fees.map((fee, index) => (
          <div className="disclosure-card__row disclosure-card__row--fee" key={index}>
            <dt>{fee.label}</dt>
            <dd>{formatCurrency(fee.amount, currency)}</dd>
          </div>
        ))}
        <div className="disclosure-card__row">
          <dt>Due date</dt>
          <dd>{formatDate(dueDate)}</dd>
        </div>
        {termDays ? (
          <div className="disclosure-card__row">
            <dt>Term</dt>
            <dd>{termDays} days</dd>
          </div>
        ) : null}
        {effectiveRatePct ? (
          <div className="disclosure-card__row">
            <dt>Cost of this loan</dt>
            <dd>{effectiveRatePct}% of what you borrow</dd>
          </div>
        ) : null}
      </dl>

      {flags.length > 0 ? (
        <ul className="disclosure-card__flags">
          {flags.map((flag) => (
            <li key={flag} className="disclosure-card__flag-tag">
              {flag.replace(/_/g, " ")}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
