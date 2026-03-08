import { useState, useRef, useEffect } from "react";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const MODES = [
  { id: "vocab", label: "Vocabulary", icon: "📚", desc: "Learn new words with examples & exercises" },
  { id: "grammar", label: "Grammar", icon: "📐", desc: "Master structures step by step" },
  { id: "conversation", label: "Conversation", icon: "💬", desc: "Practice real-life dialogues" },
  { id: "correction", label: "Correction", icon: "✏️", desc: "Write and get instant feedback" },
];

const SYSTEM_PROMPT = (level, mode) => `You are an English Learning Coach — warm, direct, and effective.

Student level: ${level}
Current mode: ${mode}

SKILL RULES:
- Respond in English for lessons; use Spanish for explanations when the student is Beginner or confused.
- Always label clearly: Word:, Meaning:, Example:, Exercise: (when in Vocabulary mode).
- In Grammar mode: give the rule, a clear example, and one fill-in exercise.
- In Conversation mode: play a real scenario, correct errors inline, keep it flowing.
- In Correction mode: show the corrected text first, then list numbered errors with brief explanations.
- Keep responses CONCISE — max 150 words. No long lectures.
- End every message with either an exercise prompt or a question to keep the student engaged.
- Use ✓ for correct things, ✗ for errors, → for suggestions.
- Tone: encouraging, never condescending.

Mode behavior:
- vocab: Teach 1-2 words per turn, structured format
- grammar: One grammar point, minimal jargon, one exercise
- conversation: You start the scenario, respond to the student, correct naturally mid-flow
- correction: Correct whatever they write, explain each error concisely`;

const STARTERS = {
  vocab: "Empecemos con vocabulario útil. ¿Hay algún tema que te interese? (travel, work, daily life...)\n\nOr I'll choose:\n\n**Word:** achieve\n**Meaning:** lograr / alcanzar\n**Example:** *\"She worked hard to achieve her goals.\"*\n**Exercise:** Translate → *\"Quiero lograr mis metas este año.\"*",
  grammar: "Let's tackle a key grammar point.\n\n**Topic: Present Simple vs. Present Continuous**\n\n✓ Present Simple = habits/facts\n*\"I work every day.\"*\n\n✓ Present Continuous = right now\n*\"I am working right now.\"*\n\n**Exercise:** Choose the right form:\n→ *\"She ____ (study/is studying) for her exam at the moment.\"*\n\nWrite your answer!",
  conversation: "Let's practice! I'll be a barista ☕\n\n*\"Good morning! Welcome to Brew & Co. What can I get for you today?\"*\n\nResponde en inglés — no te preocupes si no es perfecto, ¡yo corrijo!",
  correction: "¡Perfecto! Escribe cualquier frase o párrafo en inglés y yo lo corrijo con explicaciones.\n\nPrueba algo como:\n→ A sentence about your day\n→ An email introduction\n→ Any thought in English\n\n*Go ahead — write something!*",
};

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "16px",
      gap: "10px",
      alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: "32px", height: "32px", borderRadius: "0",
          background: "#F5E642", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "16px", flexShrink: 0,
          border: "2px solid #0A0A0A", marginTop: "2px",
        }}>🎓</div>
      )}
      <div style={{
        maxWidth: "78%",
        background: isUser ? "#0A0A0A" : "#FAFAF5",
        color: isUser ? "#F5E642" : "#0A0A0A",
        padding: "12px 16px",
        border: "2px solid #0A0A0A",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "13px",
        lineHeight: "1.7",
        whiteSpace: "pre-wrap",
        boxShadow: isUser ? "none" : "3px 3px 0 #0A0A0A",
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: "32px", height: "32px",
          background: "#0A0A0A", border: "2px solid #0A0A0A",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px", color: "#F5E642", flexShrink: 0, marginTop: "2px",
          fontFamily: "'IBM Plex Mono', monospace", fontWeight: "700",
        }}>
          YO
        </div>
      )}
    </div>
  );
}

export default function EnglishCoach() {
  const [screen, setScreen] = useState("setup"); // setup | chat
  const [level, setLevel] = useState("Intermediate");
  const [mode, setMode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSession = () => {
    if (!mode) return;
    const starter = STARTERS[mode.id];
    setMessages([{ role: "assistant", content: starter }]);
    setScreen("chat");
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT(level, mode.label),
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = data.content?.find(b => b.type === "text")?.text || "Error — try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const reset = () => {
    setScreen("setup");
    setMessages([]);
    setMode(null);
    setInput("");
  };

  // ─── SETUP SCREEN ──────────────────────────────────────────
  if (screen === "setup") return (
    <div style={{
      minHeight: "100vh",
      background: "#FAFAF5",
      fontFamily: "'IBM Plex Mono', monospace",
      padding: "0",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        background: "#0A0A0A",
        padding: "20px 32px",
        borderBottom: "4px solid #F5E642",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <div style={{
          background: "#F5E642", width: "44px", height: "44px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "22px", border: "2px solid #F5E642",
        }}>🎓</div>
        <div>
          <div style={{ color: "#F5E642", fontSize: "20px", fontWeight: "700", letterSpacing: "-0.5px" }}>
            ENGLISH COACH
          </div>
          <div style={{ color: "#888", fontSize: "11px", letterSpacing: "2px" }}>
            AI-POWERED LEARNING
          </div>
        </div>
      </div>

      <div style={{ padding: "40px 32px", maxWidth: "640px", margin: "0 auto", width: "100%" }}>
        {/* Level */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{
            fontSize: "11px", letterSpacing: "3px", color: "#888",
            marginBottom: "16px", fontWeight: "700",
          }}>01 — TU NIVEL</div>
          <div style={{ display: "flex", gap: "10px" }}>
            {LEVELS.map(l => (
              <button key={l} onClick={() => setLevel(l)} style={{
                flex: 1, padding: "14px 8px",
                background: level === l ? "#0A0A0A" : "transparent",
                color: level === l ? "#F5E642" : "#0A0A0A",
                border: `2px solid #0A0A0A`,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px", fontWeight: "700",
                cursor: "pointer",
                letterSpacing: "1px",
                boxShadow: level === l ? "3px 3px 0 #F5E642" : "3px 3px 0 #0A0A0A",
                transition: "all 0.12s",
              }}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{
            fontSize: "11px", letterSpacing: "3px", color: "#888",
            marginBottom: "16px", fontWeight: "700",
          }}>02 — ELIGE TU MODO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m)} style={{
                padding: "18px 20px",
                background: mode?.id === m.id ? "#0A0A0A" : "transparent",
                color: mode?.id === m.id ? "#FAFAF5" : "#0A0A0A",
                border: "2px solid #0A0A0A",
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: "pointer",
                textAlign: "left",
                display: "flex", alignItems: "center", gap: "16px",
                boxShadow: mode?.id === m.id ? "4px 4px 0 #F5E642" : "4px 4px 0 #0A0A0A",
                transition: "all 0.12s",
              }}>
                <span style={{ fontSize: "24px" }}>{m.icon}</span>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "2px" }}>
                    {m.label.toUpperCase()}
                    {mode?.id === m.id && <span style={{ color: "#F5E642", marginLeft: "10px" }}>←</span>}
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.65, letterSpacing: "0.5px" }}>{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Start */}
        <button onClick={startSession} disabled={!mode} style={{
          width: "100%", padding: "18px",
          background: mode ? "#F5E642" : "#ddd",
          color: mode ? "#0A0A0A" : "#999",
          border: `2px solid ${mode ? "#0A0A0A" : "#ccc"}`,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "15px", fontWeight: "700",
          cursor: mode ? "pointer" : "not-allowed",
          letterSpacing: "2px",
          boxShadow: mode ? "5px 5px 0 #0A0A0A" : "none",
          transition: "all 0.12s",
        }}>
          {mode ? `START ${mode.label.toUpperCase()} →` : "SELECT A MODE TO BEGIN"}
        </button>

        <div style={{
          marginTop: "24px", padding: "16px",
          border: "1px dashed #ccc", fontSize: "11px",
          color: "#888", lineHeight: "1.6", letterSpacing: "0.3px",
        }}>
          💡 NIVEL SELECCIONADO: <strong style={{ color: "#0A0A0A" }}>{level}</strong> —
          El coach adaptará las explicaciones a tu nivel. Puedes escribir en español o en inglés.
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
    </div>
  );

  // ─── CHAT SCREEN ──────────────────────────────────────────
  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#FAFAF5", fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {/* Chat Header */}
      <div style={{
        background: "#0A0A0A",
        padding: "14px 20px",
        borderBottom: "3px solid #F5E642",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px" }}>{mode.icon}</span>
          <div>
            <div style={{ color: "#F5E642", fontSize: "13px", fontWeight: "700", letterSpacing: "1px" }}>
              {mode.label.toUpperCase()} MODE
            </div>
            <div style={{ color: "#666", fontSize: "10px", letterSpacing: "2px" }}>
              {level.toUpperCase()} · ENGLISH COACH
            </div>
          </div>
        </div>
        <button onClick={reset} style={{
          background: "transparent", border: "1px solid #444",
          color: "#888", padding: "6px 12px",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px",
          cursor: "pointer", letterSpacing: "1px",
        }}>← CAMBIAR MODO</button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "24px 20px",
        display: "flex", flexDirection: "column",
      }}>
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {loading && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{
              width: "32px", height: "32px", background: "#F5E642",
              border: "2px solid #0A0A0A", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "16px",
            }}>🎓</div>
            <div style={{
              padding: "12px 16px", border: "2px solid #0A0A0A",
              background: "#FAFAF5", boxShadow: "3px 3px 0 #0A0A0A",
              color: "#888", fontSize: "12px", letterSpacing: "2px",
            }}>
              THINKING...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 20px",
        borderTop: "3px solid #0A0A0A",
        background: "#FAFAF5",
        display: "flex", gap: "10px", alignItems: "flex-end",
        flexShrink: 0,
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            mode.id === "correction" ? "Write your English here..." :
            mode.id === "conversation" ? "Respond in English..." :
            "Type your answer or question..."
          }
          rows={2}
          style={{
            flex: 1, padding: "12px 14px",
            border: "2px solid #0A0A0A",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "13px", lineHeight: "1.5",
            background: "#fff", color: "#0A0A0A",
            resize: "none", outline: "none",
            boxShadow: "3px 3px 0 #0A0A0A",
          }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
          padding: "12px 20px", height: "64px",
          background: input.trim() && !loading ? "#F5E642" : "#eee",
          border: "2px solid #0A0A0A",
          color: "#0A0A0A",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "18px", fontWeight: "700",
          cursor: input.trim() && !loading ? "pointer" : "not-allowed",
          boxShadow: input.trim() ? "3px 3px 0 #0A0A0A" : "none",
          transition: "all 0.1s",
          flexShrink: 0,
        }}>→</button>
      </div>

      <div style={{
        padding: "6px 20px 10px",
        fontSize: "10px", color: "#aaa", letterSpacing: "1px",
        background: "#FAFAF5", flexShrink: 0,
      }}>
        ENTER para enviar · SHIFT+ENTER para nueva línea
      </div>

      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet" />
    </div>
  );
}