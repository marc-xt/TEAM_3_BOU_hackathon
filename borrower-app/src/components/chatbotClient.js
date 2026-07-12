const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000/api";

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
  const res = await fetch(`${API_BASE}/chatbot/message/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      language,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }),
  });
  return parseJsonResponse(res);
}

export async function sendChatVoice({ audioBlob, mimeType, language, conversationId }) {
  const extension = mimeType?.includes("mp4") ? "m4a" : mimeType?.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("audio", audioBlob, `voice-message.${extension}`);
  form.append("language", language);
  if (conversationId) form.append("conversation_id", conversationId);

  const res = await fetch(`${API_BASE}/chatbot/voice/`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parseJsonResponse(res);
}