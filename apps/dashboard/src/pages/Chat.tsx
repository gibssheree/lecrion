import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { getHistory, clearHistory } from "../services/api";
import { Phone, MessageSquare, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "../components/ui";

export default function Chat() {
  const [filter, setFilter] = useState("");
  const hist = useApi(getHistory, [], { autoRefreshMs: 10_000 });

  const entries = ((hist.data?.history ?? []) as any[]).filter(
    (e) =>
      !filter ||
      e.sender?.includes(filter) ||
      e.question?.toLowerCase().includes(filter.toLowerCase()),
  );

  async function handleClear(sender: string) {
    if (!confirm(`Hapus semua history untuk ${sender}?`)) return;
    try {
      await clearHistory(sender);
      hist.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  const bySender = entries.reduce<Record<string, any[]>>((acc, e) => {
    (acc[e.sender] = acc[e.sender] || []).push(e);
    return acc;
  }, {});

  return (
    <>
      <PageHeader onRefresh={hist.reload}>
        <input
          className="form-input"
          placeholder="Filter by sender or message…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1 }}
        />
      </PageHeader>

      {hist.error && <div className="alert error">{hist.error}</div>}

      {Object.entries(bySender).map(([sender, msgs]) => (
        <div className="card" key={sender}>
          <div
            className="card-title"
            style={{ justifyContent: "space-between" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Phone size={14} /> {sender}
              <span className="badge gray">{msgs.length} pesan</span>
            </span>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleClear(sender)}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <Trash2 size={13} /> Hapus History
            </button>
          </div>
          <div className="chat-list">
            {msgs.slice(-10).map((msg: any, i: number) => (
              <div key={i} className="chat-entry" style={{ gap: 4 }}>
                <div className="chat-bubble user">
                  {msg.question}
                  <div className="chat-meta">
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleString("id-ID")
                      : ""}
                  </div>
                </div>
                {msg.reply && (
                  <div className="chat-bubble bot">{msg.reply}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!hist.loading && !Object.keys(bySender).length && (
        <EmptyState
          icon={<MessageSquare size={40} color="var(--text-muted)" />}
          message={`Belum ada percakapan${filter ? ` untuk "${filter}"` : ""}`}
          padding={48}
        />
      )}
    </>
  );
}
