import { useState } from "react";

// Captures a raw loan SMS and hands it up. Render + input only — no parsing here.
export default function SmsInput({ onSubmit, disabled, samples = [] }) {
  const [text, setText] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form className="sms-input" onSubmit={handleSubmit}>
      <label className="sms-input__label" htmlFor="sms-text">
        Paste a loan SMS
      </label>
      <textarea
        id="sms-text"
        className="sms-input__field"
        rows={3}
        placeholder="e.g. Your MoKash loan of UGX 100,000 has been disbursed…"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
      />
      {samples.length > 0 ? (
        <div className="sms-input__samples">
          <span className="sms-input__samples-label">Try a sample:</span>
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className="sms-input__chip"
              onClick={() => setText(sample.text)}
              disabled={disabled}
            >
              {sample.label}
            </button>
          ))}
        </div>
      ) : null}
      <button className="sms-input__submit" type="submit" disabled={disabled || !text.trim()}>
        {disabled ? "Analysing…" : "Analyse this loan"}
      </button>
    </form>
  );
}
