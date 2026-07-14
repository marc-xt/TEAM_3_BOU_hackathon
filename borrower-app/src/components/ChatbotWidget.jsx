import { useCallback, useEffect, useRef, useState } from "react";
import { sendChatMessage, sendChatVoice } from "./chatbotClient";
import "./ChatbotWidget.css";

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "sw", label: "Kiswahili" },
  { id: "lg", label: "Luganda", beta: true },
];

const TEASER_TEXT = "Ask me about your next financial decision";

function FlagChip({ flag }) {
  if (!flag) return null;
  const label = { safe: "Safe", caution: "Caution", high: "High risk" }[flag] || flag;
  return <span className={`chat-flag chat-flag--${flag}`}>{label}</span>;
}

function TypingDots() {
  return (
    <div className="chat-bubble chat-bubble--assistant chat-bubble--typing" aria-live="polite">
      <span className="chat-typing-dot" />
      <span className="chat-typing-dot" />
      <span className="chat-typing-dot" />
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`chat-bubble ${isUser ? "chat-bubble--user" : "chat-bubble--assistant"}`}>
      {message.isVoice ? <i className="fa-solid fa-microphone chat-bubble__voice-icon" aria-hidden="true" /> : null}
      <p className="chat-bubble__text">{message.content}</p>
      <div className="chat-bubble__meta">
        <FlagChip flag={message.flag} />
        {message.languageBeta ? <span className="chat-flag chat-flag--beta">Beta</span> : null}
        {message.audioUrl ? (
          <button
            type="button"
            className="chat-bubble__replay"
            onClick={() => new Audio(message.audioUrl).play()}
            aria-label="Play voice reply again"
          >
            <i className="fa-solid fa-volume-high" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [language, setLanguage] = useState("en");
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorText, setErrorText] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowTeaser(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  function openWidget() {
    setOpen(true);
    setShowTeaser(false);
  }

  const appendMessage = useCallback((message) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, ...message }]);
  }, []);

  async function handleSendText(e) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || status === "loading") return;

    appendMessage({ role: "user", content: text });
    setInputText("");
    setStatus("loading");
    setErrorText(null);

    try {
      const data = await sendChatMessage({ message: text, language, conversationId });
      setConversationId(data.conversation_id);
      appendMessage({
        role: "assistant",
        content: data.reply,
        flag: data.flag,
        languageBeta: data.language_beta,
      });
      setStatus("idle");
    } catch (err) {
      setErrorText(err.message);
      setStatus("error");
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        handleVoiceReady(new Blob(audioChunksRef.current, { type: recorder.mimeType }), recorder.mimeType);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setErrorText("Microphone access was denied or is unavailable.");
      setStatus("error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function handleVoiceReady(audioBlob, mimeType) {
    setStatus("loading");
    setErrorText(null);

    try {
      const data = await sendChatVoice({ audioBlob, mimeType, language, conversationId });
      setConversationId(data.conversation_id);
      appendMessage({ role: "user", content: data.transcript, isVoice: true });
      appendMessage({
        role: "assistant",
        content: data.reply_text,
        flag: data.flag,
        languageBeta: data.language_beta,
        audioUrl: data.reply_audio_url,
      });
      new Audio(data.reply_audio_url).play().catch(() => {
        // Autoplay can be blocked by the browser; the replay button covers this case.
      });
      setStatus("idle");
    } catch (err) {
      setErrorText(err.message);
      setStatus("error");
    }
  }

  return (
    <div className="chat-widget">
      {!open && showTeaser ? (
        <button type="button" className="chat-teaser" onClick={openWidget}>
          {TEASER_TEXT}
        </button>
      ) : null}

      {open ? (
        <div className="chat-panel" role="dialog" aria-label="Your Financial Assistant">
          <header className="chat-panel__header">
            <div>
              <h2 className="chat-panel__title">Your Financial Assistant</h2>
              <select
                className="chat-lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Chat language"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                    {lang.beta ? " (Beta)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="chat-panel__close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </header>

          <div className="chat-panel__messages">
            {messages.length === 0 ? (
              <p className="chat-empty-state">
                Ask me anything about a loan, your budget, or your borrowing health.
              </p>
            ) : null}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {status === "loading" ? <TypingDots /> : null}
            {status === "error" ? (
              <p className="chat-error" role="alert">
                {errorText}
              </p>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-panel__input-row" onSubmit={handleSendText}>
            <button
              type="button"
              className={`chat-mic-btn ${isRecording ? "is-recording" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? "Stop recording" : "Record a voice message"}
            >
              <i className={`fa-solid ${isRecording ? "fa-stop" : "fa-microphone"}`} aria-hidden="true" />
            </button>
            <input
              type="text"
              className="chat-text-input"
              placeholder="Type your question…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isRecording}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!inputText.trim() || status === "loading" || isRecording}
              aria-label="Send message"
            >
              <i className="fa-solid fa-paper-plane" aria-hidden="true" />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="chat-fab"
        onClick={() => (open ? setOpen(false) : openWidget())}
        aria-label={open ? "Close financial assistant" : "Open financial assistant"}
      >
        <i className={`fa-solid ${open ? "fa-xmark" : "fa-comment-dots"}`} aria-hidden="true" />
      </button>
    </div>
  );
}