// apps/pos-web/src/hooks/useRegister.ts
// Register session management hook

import { useRegisterStore } from "../store/register.store";
import {
  openRegister,
  closeRegister,
  suspendRegister,
  resumeRegister,
} from "../services/api";

export function useRegister() {
  const session = useRegisterStore((s) => s.session);
  const status = useRegisterStore((s) => s.status);
  const refresh = useRegisterStore((s) => s.refresh);

  async function open(cashierId: string, openingCash: number, notes?: string) {
    await openRegister({ cashierId, openingCash, notes });
    await refresh();
  }

  async function close(
    sessionId: number,
    countedCash: number,
    operatorId: string,
    notes?: string,
  ) {
    await closeRegister({ sessionId, countedCash, operatorId, notes });
    await refresh();
  }

  async function suspend(sessionId: number) {
    await suspendRegister(sessionId);
    await refresh();
  }

  async function resume(sessionId: number) {
    await resumeRegister(sessionId);
    await refresh();
  }

  return { session, status, refresh, open, close, suspend, resume };
}
