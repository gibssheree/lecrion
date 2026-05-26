import { useMemo } from "react";
import { useApi } from "./useApi";
import { listUsers } from "../services/api";

export function useUserMap() {
  const users = useApi(listUsers, [], { autoRefreshMs: 0 });

  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users.data ?? []) {
      m.set(String(u.id), u.email.split("@")[0]);
    }
    return m;
  }, [users.data]);

  function resolveName(id: string | number | null | undefined): string {
    if (id == null || id === "") return "—";
    return map.get(String(id)) ?? String(id);
  }

  return { resolveName };
}
