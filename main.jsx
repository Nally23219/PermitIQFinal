import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const BASE = "https://permitiqfinal.onrender.com";

const styles = {
  bubble: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1a73e8, #0d47a1)",
    color: "#fff",
    fontSize: "26px",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    transition: "transform 0.2s",
  },
  window: {
    position: "fixed",
    bottom: "90px",
    right: "24px",
    width: "340px",
    height: "480px",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    overflow: "hidden",
    fontFamily: "sans-serif",
  },
  header: {
    background: "linear-gradient(135deg, #1a73e8, #0d47a1)",
    color: "#fff",
    padding: "14px 16px",
    fontWeight: "bold",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    background: "#f7f9fc",
  },
  msgUser: {
    alignSelf: "flex-end",
    background: "#1a73e8",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "12px 12px 2px 12px",
    maxWidth: "80%",
    fontSize: "14px",
    lineHeight: "1.4",
  },
  msgBot: {
    alignSelf: "flex-start",
    background: "#fff",
    color: "#333",
    padding: "8px 12px",
    borderRadius: "12px 12px 12px 2px",
    maxWidth: "80%",
    fontSize: "14px",
    lineHeight: "1.4",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    whiteSpace: "pre-wrap",
  },
  inputRow: {
    display: "flex",
    padding: "10px",
    gap: "8px",
    borderTop: "1px solid #e8eaed",
    background: "#fff",
  },
  input: {
    flex: 1,
    border: "1px solid #ddd",
    borderRadius: "20px",
    padding: "8px 14px",
    fontSize: "14px",
    outline: "none",
  },
  sendBtn: {
    background: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  typing: {
    alignSelf: "flex-start",
    background: "#fff",
    color: "#999",
    padding: "8px 12px",
    borderRadius: "12px 12px 12px 2px",
    fontSize: "13px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
};

const SYSTEM = `You are PermitIQ Assistant, a helpful expert on permits and licensing. 
You answer questions about construction & building permits, business licenses, zoning, 
and general permitting processes clearly and concisely. 
If a question is outside permitting topics, politely redirect the user back to permit-related questions.
Keep answers brief and practical — under 150 words unless more detail is truly needed.`;

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm the PermitIQ assistant. Ask me anything about building permits, business licenses, or zoning — I'm here to help! 🏗️" }
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

  const onKey = (e) => { if (e.key === "Enter") send(); };

  return (
    <>
      {open && (
        <div style={styles.window}>
          <div style={styles.header}>
            <span>🏗️</span> PermitIQ Assistant
            <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}>×</button>
          </div>
          <div style={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === "user" ? styles.msgUser : styles.msgBot}>{m.text}</div>
            ))}
            {loading && <div style={styles.typing}>Typing…</div>}
            <div ref={bottomRef} />
          </div>
          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask a permit question…"
            />
            <button style={styles.sendBtn} onClick={send}>➤</button>
          </div>
        </div>
      )}
      <button style={styles.bubble} onClick={() => setOpen(o => !o)}>
        {open ? "×" : "💬"}
      </button>
    </>
  );
}
