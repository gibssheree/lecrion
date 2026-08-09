import { useState } from "react";
import { MessageSquare, Phone, Trash2 } from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import {
  EmptyState,
  PageToolbar,
  StatusBadge,
} from "../../components/chatbot/ChatbotUi";
import { useApi } from "../../hooks/useApi";
import { clearHistory, getHistory } from "../../services/api";
import { confirmDialog } from "../../store/confirm.store";

export default function ChatbotChatPage() {
  const [filter, setFilter] = useState("");
  const [clearingFor, setClearingFor] = useState<string | null>(null);
  const history = useApi(getHistory, [], { autoRefreshMs: 10_000 });

  const entries = ((history.data?.history ?? []) as any[]).filter(
    (entry) =>
      !filter ||
      entry.sender?.includes(filter) ||
      entry.question?.toLowerCase().includes(filter.toLowerCase()),
  );

  const bySender = entries.reduce<Record<string, any[]>>((acc, entry) => {
    (acc[entry.sender] = acc[entry.sender] || []).push(entry);
    return acc;
  }, {});

  async function handleClear(sender: string) {
    const ok = await confirmDialog({
      title: "Hapus History",
      message: `Hapus semua history percakapan untuk "${sender}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    setClearingFor(sender);
    try {
      await clearHistory(sender);
      history.reload();
    } finally {
      setClearingFor(null);
    }
  }

  return (
    <PosAppShell title="Chat History">
      <PageToolbar onRefresh={history.reload} refreshing={history.loading}>
        <input
          className="form-input"
          placeholder="Filter nomor atau pesan..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </PageToolbar>

      {history.error && (
        <div className="alert alert-error">{history.error}</div>
      )}

      {Object.entries(bySender).map(([sender, messages]) => (
        <div className="dashboard-card" key={sender}>
          <div className="dashboard-card-header">
            <span className="chatbot-label-inline">
              <Phone size={14} /> {sender}
              <StatusBadge status={`${messages.length} pesan`} color="gray" />
            </span>
            <button
              className="btn btn-danger btn-sm"
              type="button"
              disabled={clearingFor === sender}
              onClick={() => handleClear(sender)}
            >
              {clearingFor === sender ? (
                <>
                  <div className="spinner chatbot-button-spinner" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 size={13} /> Hapus History
                </>
              )}
            </button>
          </div>
          <div className="dashboard-card-body">
            <div className="chatbot-thread">
              {messages.slice(-10).map((message: any, index: number) => (
                <div className="chatbot-entry" key={index}>
                  <div className="chatbot-bubble chatbot-bubble--user">
                    {message.question}
                    <div className="chatbot-meta">
                      {message.created_at
                        ? new Date(message.created_at).toLocaleString("id-ID")
                        : ""}
                    </div>
                  </div>
                  {message.reply && (
                    <div className="chatbot-bubble chatbot-bubble--bot">
                      {message.reply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {!history.loading && !Object.keys(bySender).length && (
        <EmptyState
          icon={<MessageSquare size={40} color="var(--text-muted)" />}
          message={`Belum ada percakapan${filter ? ` untuk "${filter}"` : ""}`}
          padding={48}
        />
      )}
    </PosAppShell>
  );
}
