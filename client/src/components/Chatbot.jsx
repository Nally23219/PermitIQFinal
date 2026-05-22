import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const BASE = "https://permitiqfinal.onrender.com";

const SYSTEM = `You are PermitIQ Assistant, a helpful expert on permits and licensing.
You answer questions about construction & building permits, business licenses, zoning,
and general permitting processes clearly and concisely.
If a question is outside permitting topics, politely redirect the user back to permit-related questions.
Keep answers brief and practical — under 150 words unless more detail is truly needed.`;

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm your PermitIQ assistant. Ask me anything about building permits, business licenses, or zoning. 🏗️" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await axios.post(`${BASE}/chat`, { message: text, history: messages });
      setMessages(prev => [...prev, { role: "bot", text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "Sorry, I had trouble connecting. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <>
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <span className="chat-avatar">⬡</span>
              <div>
                <div className="chat-title">PermitIQ Assistant</div>
                <div className="chat-status"><span className="status-dot" />Online</div>
              </div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "msg-user" : "msg-bot"}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="msg msg-bot typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask a permit question…"
            />
            <button className="chat-send" onClick={send}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
      <button className={`chat-bubble ${open ? "open" : ""}`} onClick={() => setOpen(o => !o)}>
        {open ? "×" : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>
    </>
  );
}
