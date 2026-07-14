import { authFetch } from "../api/authClient";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonResponse(res) {
  if (!res.ok) {
    let detail = `Chatbot request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch (_) {
      // response wasn't JSON; keep the generic detail message
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function sendChatMessage({ message, language, conversationId }) {
  const res = await authFetch(`${API_BASE}/chatbot/message/`, () => ({
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      message,
      language,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }),
  }));
  return parseJsonResponse(res);
}

export async function sendChatVoice({ audioBlob, mimeType, language, conversationId }) {
  const extension = mimeType?.includes("mp4") ? "m4a" : mimeType?.includes("ogg") ? "ogg" : "webm";

  // Rebuilt fresh each call by authFetch's buildInit — FormData bodies can't
  // be reused after a failed fetch attempt, so a new instance is created on
  // every invocation (including the post-refresh retry) rather than reusing
  // one form object across both attempts.
  function buildInit() {
    const form = new FormData();
    form.append("audio", audioBlob, `voice-message.${extension}`);
    form.append("language", language);
    if (conversationId) form.append("conversation_id", conversationId);
    return {
      method: "POST",
      headers: authHeaders(), // don't set Content-Type manually for FormData
      body: form,
    };
  }

  const res = await authFetch(`${API_BASE}/chatbot/voice/`, buildInit);
  return parseJsonResponse(res);
}