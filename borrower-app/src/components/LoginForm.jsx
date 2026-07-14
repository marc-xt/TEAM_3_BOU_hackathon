import { useState } from "react";
import { login } from "../api/authClient";

export default function LoginForm({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorText, setErrorText] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setErrorText(null);

    try {
      await login(username, password);
      setStatus("idle");
      onLoginSuccess?.();
    } catch (err) {
      setErrorText(err.message);
      setStatus("error");
    }
  }

  return (
    <div className="app__panel" style={{ maxWidth: 360, margin: "var(--space-5) auto" }}>
      <h2 className="app__panel-title">Log in to BorrowWise</h2>
      <form onSubmit={handleSubmit} className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {status === "error" ? (
          <p className="app__state app__state--error" role="alert">
            {errorText}
          </p>
        ) : null}
        <button
          type="submit"
          className="btn-primary"
          disabled={status === "loading" || !username || !password}
        >
          {status === "loading" ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}