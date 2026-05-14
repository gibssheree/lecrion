import { useState, useRef, useEffect } from "react";
import { llmChat, getLlmTools } from "../services/api";
import { useApi } from "../hooks/useApi";
import {
  MessageSquare,
  Wrench,
  Trash2,
  Send,
  Bot,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

const ROLES = ["admin", "customer", "cashier", "support"] as const;
type Role = (typeof ROLES)[number];

interface Message {
  role: "user" | "bot" | "error";
  text: string;
}

export default function LLMConsole() {
  const [role, setRole] = useState<Role>("admin");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"chat" | "tools">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const tools = useApi(getLlmTools, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const result = await llmChat(msg, role);
      setMessages((prev) => [...prev, { role: "bot", text: result.reply }]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          text: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Tab bar */}
      <div className="card" style={{ padding: "8px 16px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["chat", "tools"] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setTab(t)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {t === "chat" ? (
                <MessageSquare size={13} />
              ) : (
                <Wrench size={13} />
              )}
              {t === "chat" ? "Chat Console" : "Tool Inspector"}
            </button>
          ))}
        </div>
      </div>

      {tab === "chat" && (
        <>
          {/* Role selector */}
          <div className="card" style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                ROLE:
              </span>
              {ROLES.map((r) => (
                <button
                  key={r}
                  className={`btn btn-sm ${role === r ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setRole(r)}
                >
                  {r}
                </button>
              ))}
              <button
                className="btn btn-ghost btn-sm"
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
                onClick={() => setMessages([])}
              >
                <Trash2 size={13} /> Clear
              </button>
            </div>
          </div>

          {/* Chat area */}
          <div
            className="card"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 400,
            }}
          >
            <div
              className="card-title"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Bot size={14} /> LLM Test Console{" "}
              <span className="badge blue">{role}</span>
            </div>
            <div
              className="chat-list"
              style={{
                flex: 1,
                overflowY: "auto",
                maxHeight: 400,
                paddingRight: 4,
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    padding: 32,
                  }}
                >
                  Kirim pesan untuk mulai uji coba LLM dengan role{" "}
                  <strong>{role}</strong>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className="chat-entry">
                  {m.role === "user" && (
                    <div className="chat-bubble user">{m.text}</div>
                  )}
                  {m.role === "bot" && (
                    <div className="chat-bubble bot">{m.text}</div>
                  )}
                  {m.role === "error" && (
                    <div
                      className="alert error"
                      style={{ alignSelf: "flex-start" }}
                    >
                      {m.text}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div
                  className="chat-bubble bot"
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <div className="spinner" style={{ width: 14, height: 14 }} />{" "}
                  Generating…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                className="form-textarea"
                style={{ flex: 1, minHeight: 60, resize: "none" }}
                placeholder={`Kirim pesan sebagai ${role}… (Enter to send, Shift+Enter for newline)`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
              />
              <button
                className="btn btn-primary"
                style={{
                  alignSelf: "flex-end",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                disabled={loading || !input.trim()}
                onClick={send}
              >
                <Send size={13} /> Kirim
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "tools" && (
        <div className="card">
          <div className="card-title">
            <Wrench size={14} /> Tool Definitions
          </div>
          {tools.loading ? (
            <div className="loading-overlay">
              <div className="spinner" />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {((tools.data?.tools ?? []) as any[]).map((t: any) => (
                <div
                  key={t.name}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <code
                      style={{
                        color: "var(--primary)",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {t.name}
                    </code>
                    <span
                      className={`badge ${t.readOnly ? "green" : "yellow"}`}
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {t.readOnly ? (
                        <ShieldCheck size={10} />
                      ) : (
                        <ShieldAlert size={10} />
                      )}
                      {t.readOnly ? "read-only" : "write"}
                    </span>
                  </div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    {t.description}
                  </p>
                  {Object.keys(t.parameters ?? {}).length > 0 && (
                    <table className="data-table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Param</th>
                          <th>Tipe</th>
                          <th>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(t.parameters).map(
                          ([k, v]: [string, any]) => (
                            <tr key={k}>
                              <td>
                                <code>{k}</code>
                                {v.required && (
                                  <span
                                    className="badge red"
                                    style={{ marginLeft: 4, fontSize: 9 }}
                                  >
                                    req
                                  </span>
                                )}
                              </td>
                              <td>{v.type}</td>
                              <td>{v.description}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
