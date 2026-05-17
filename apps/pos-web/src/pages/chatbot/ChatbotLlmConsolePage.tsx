import { KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  MessageSquare,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import { useApi } from "../../hooks/useApi";
import { getLlmTools, llmChat } from "../../services/api";

const ROLES = ["admin", "customer", "cashier", "support"] as const;
type Role = (typeof ROLES)[number];

interface Message {
  role: "user" | "bot" | "error";
  text: string;
}

export default function ChatbotLlmConsolePage() {
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
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const result = await llmChat(text, role);
      setMessages((prev) => [...prev, { role: "bot", text: result.reply }]);
    } catch (error: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          text: error instanceof Error ? error.message : String(error),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return (
    <PosAppShell title="LLM Console">
      <div className="dashboard-card chatbot-tabs-card">
        <div className="chatbot-tab-row">
          {(["chat", "tools"] as const).map((item) => (
            <button
              key={item}
              className={`btn btn-sm ${tab === item ? "btn-primary" : "btn-ghost"}`}
              type="button"
              onClick={() => setTab(item)}
            >
              {item === "chat" ? (
                <MessageSquare size={13} />
              ) : (
                <Wrench size={13} />
              )}
              {item === "chat" ? "Chat Console" : "Tool Inspector"}
            </button>
          ))}
        </div>
      </div>

      {tab === "chat" && (
        <>
          <div className="dashboard-card chatbot-tabs-card">
            <div className="chatbot-role-row">
              <span>Role</span>
              {ROLES.map((item) => (
                <button
                  key={item}
                  className={`btn btn-sm ${role === item ? "btn-primary" : "btn-ghost"}`}
                  type="button"
                  onClick={() => setRole(item)}
                >
                  {item}
                </button>
              ))}
              <button
                className="btn btn-ghost btn-sm chatbot-clear-button"
                type="button"
                onClick={() => setMessages([])}
              >
                <Trash2 size={13} /> Clear
              </button>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <span className="chatbot-label-inline">
                <Bot size={14} /> LLM Test Console
              </span>
              <span className="chatbot-badge chatbot-badge--blue">{role}</span>
            </div>
            <div className="dashboard-card-body">
              <div className="chatbot-thread chatbot-llm-thread">
                {messages.length === 0 && (
                  <div className="chatbot-empty-line">
                    Kirim pesan untuk mulai uji coba LLM dengan role{" "}
                    <strong>{role}</strong>
                  </div>
                )}
                {messages.map((message, index) => (
                  <div className="chatbot-entry" key={index}>
                    {message.role === "user" && (
                      <div className="chatbot-bubble chatbot-bubble--user">
                        {message.text}
                      </div>
                    )}
                    {message.role === "bot" && (
                      <div className="chatbot-bubble chatbot-bubble--bot">
                        {message.text}
                      </div>
                    )}
                    {message.role === "error" && (
                      <div className="alert alert-error">{message.text}</div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="chatbot-bubble chatbot-bubble--bot">
                    <div className="spinner chatbot-button-spinner" />
                    Generating...
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="chatbot-compose">
                <textarea
                  className="form-textarea"
                  placeholder={`Kirim pesan sebagai ${role}...`}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onKey}
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={loading || !input.trim()}
                  onClick={send}
                >
                  <Send size={13} /> Kirim
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "tools" && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span className="chatbot-label-inline">
              <Wrench size={14} /> Tool Definitions
            </span>
          </div>
          <div className="dashboard-card-body">
            {tools.loading ? (
              <div className="loading-center chatbot-loading">
                <div className="spinner" />
              </div>
            ) : (
              <div className="chatbot-list">
                {((tools.data?.tools ?? []) as any[]).map((tool) => (
                  <div className="chatbot-tool-card" key={tool.name}>
                    <div className="chatbot-tool-head">
                      <code>{tool.name}</code>
                      <span
                        className={`chatbot-badge chatbot-badge--${
                          tool.readOnly ? "green" : "yellow"
                        }`}
                      >
                        {tool.readOnly ? (
                          <ShieldCheck size={10} />
                        ) : (
                          <ShieldAlert size={10} />
                        )}
                        {tool.readOnly ? "read-only" : "write"}
                      </span>
                    </div>
                    <p>{tool.description}</p>
                    {Object.keys(tool.parameters ?? {}).length > 0 && (
                      <table className="pos-data-table">
                        <thead>
                          <tr>
                            <th>Param</th>
                            <th>Tipe</th>
                            <th>Keterangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(tool.parameters).map(
                            ([key, value]: [string, any]) => (
                              <tr key={key}>
                                <td>
                                  <code>{key}</code>
                                  {value.required && (
                                    <span className="chatbot-badge chatbot-badge--red chatbot-required-badge">
                                      req
                                    </span>
                                  )}
                                </td>
                                <td>{value.type}</td>
                                <td>{value.description}</td>
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
        </div>
      )}
    </PosAppShell>
  );
}
