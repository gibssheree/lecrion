import { AlertTriangle, HelpCircle } from "lucide-react";
import { useConfirmStore } from "../../store/confirm.store";
import Modal from "./Modal";
import Button from "./Button";

/** Mounted once at app root. Renders whatever confirmDialog() currently has queued. */
export default function ConfirmDialogHost() {
  const request = useConfirmStore((s) => s.request);
  const settle = useConfirmStore((s) => s.settle);

  return (
    <Modal
      open={!!request}
      onClose={() => settle(false)}
      size="sm"
      hideCloseButton
      title={
        request && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`ui-confirm-icon ${request.danger ? "ui-confirm-icon--danger" : "ui-confirm-icon--default"}`}>
              {request.danger ? <AlertTriangle size={16} /> : <HelpCircle size={16} />}
            </span>
            {request.title}
          </div>
        )
      }
      footer={
        request && (
          <>
            <Button variant="secondary" size="sm" onClick={() => settle(false)}>
              {request.cancelLabel ?? "Batal"}
            </Button>
            <Button variant={request.danger ? "danger" : "primary"} size="sm" onClick={() => settle(true)}>
              {request.confirmLabel ?? "Konfirmasi"}
            </Button>
          </>
        )
      }
    >
      {request?.message}
    </Modal>
  );
}
