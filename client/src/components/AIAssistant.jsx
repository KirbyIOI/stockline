import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { COLORS } from "../styles.js";

const STARTER_PROMPTS = [
  "Which products need reordering soonest?",
  "Summarize this week's stock position",
  "What's driving the reorder alerts?",
];

export default function AIAssistant() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role, content }
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.getAssistantStatus().then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  if (!enabled) return null;

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setError(null);
    setInput("");
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setSending(true);
    try {
      const { reply } = await api.askAssistant(content, next);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Ask Stockline"
        style={{
          position: "fixed", right: 24, bottom: 24, width: 52, height: 52, borderRadius: "50%",
          background: COLORS.primary, border: "none", cursor: "pointer", boxShadow: "0 10px 30px rgba(67,56,202,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
        }}
      >
        {open ? <X size={20} color="#fff" /> : <Sparkles size={20} color="#fff" />}
      </button>

      {open && (
        <div style={{
          position: "fixed", right: 24, bottom: 86, width: 360, maxWidth: "calc(100vw - 32px)", height: 480,
          maxHeight: "calc(100vh - 140px)", background: COLORS.panel, border: `1px solid ${COLORS.line}`,
          borderRadius: 16, boxShadow: "0 20px 60px rgba(16,24,40,0.25)", display: "flex", flexDirection: "column",
          overflow: "hidden", zIndex: 60, fontFamily: "Inter, sans-serif",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: COLORS.primarySoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} color={COLORS.primary} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Ask Stockline</div>
              <div style={{ fontSize: 11, color: COLORS.sub }}>Answers using your live inventory data</div>
            </div>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div>
                <p style={{ fontSize: 12.5, color: COLORS.sub, margin: "0 0 10px" }}>
                  Ask about reorder priorities, sell-through trends, or what a forecast means — I can see your current products, stock, and orders.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {STARTER_PROMPTS.map((p) => (
                    <button key={p} onClick={() => send(p)} style={{
                      textAlign: "left", background: COLORS.primarySoft, color: COLORS.primary, border: "none",
                      borderRadius: 9, padding: "8px 10px", fontFamily: "Inter", fontSize: 12, cursor: "pointer",
                    }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? COLORS.primary : "#F3F5F9",
                color: m.role === "user" ? "#fff" : COLORS.ink,
                borderRadius: 12, padding: "8px 12px", fontSize: 13, lineHeight: 1.45, maxWidth: "88%",
                whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: "flex-start", color: COLORS.sub, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                <Loader2 size={13} className="spin" /> Thinking…
              </div>
            )}
            {error && (
              <div style={{ background: COLORS.roseSoft, color: COLORS.rose, borderRadius: 8, padding: "7px 10px", fontSize: 12 }}>{error}</div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${COLORS.line}` }}
          >
            <input
              value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…"
              style={{ flex: 1, border: `1px solid ${COLORS.line}`, borderRadius: 9, padding: "9px 11px", fontFamily: "Inter", fontSize: 13, outline: "none" }}
            />
            <button type="submit" disabled={sending || !input.trim()} style={{
              background: COLORS.primary, border: "none", borderRadius: 9, width: 38, display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Send size={15} color="#fff" />
            </button>
          </form>
        </div>
      )}
      <style>{`.spin { animation: stockline-spin 1s linear infinite; } @keyframes stockline-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
