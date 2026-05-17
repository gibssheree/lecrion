// apps/pos-web/src/app/OnlineStatusProvider.tsx
//
// Phase 8 — Provides online status and sync queue state to the entire app.
// Wrap around the router so TopBar, BottomBar, and useCheckout can all
// read the same online/sync state without prop drilling.

import { createContext, useContext, ReactNode } from "react";
import { useOnlineStatus, OnlineStatus } from "../hooks/useOnlineStatus";
import { useSyncQueue, SyncQueueState } from "../hooks/useSyncQueue";

interface OnlineContextValue extends OnlineStatus, SyncQueueState {}

const OnlineContext = createContext<OnlineContextValue>({
  isOnline: true,
  isBrowserOffline: false,
  lastCheckedAt: Date.now(),
  check: async () => {},
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  failedCount: 0,
  triggerSync: async () => {},
});

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const onlineStatus = useOnlineStatus();
  const syncQueue = useSyncQueue(onlineStatus.isOnline);

  return (
    <OnlineContext.Provider value={{ ...onlineStatus, ...syncQueue }}>
      {children}
    </OnlineContext.Provider>
  );
}

export function useOnlineContext(): OnlineContextValue {
  return useContext(OnlineContext);
}
