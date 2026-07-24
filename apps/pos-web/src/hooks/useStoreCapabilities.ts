import { getStoreCapabilities } from "../services/api";
import { useApi } from "./useApi";

const CORE_MODULE_PREFIX = "core.";

export function useStoreCapabilities() {
  const capabilities = useApi(getStoreCapabilities, [], { autoRefreshMs: 0 });
  const enabledModules = capabilities.data?.enabledModules ?? [];

  function hasModule(moduleKey: string): boolean {
    if (enabledModules.includes(moduleKey)) return true;
    return capabilities.loading && moduleKey.startsWith(CORE_MODULE_PREFIX);
  }

  return {
    ...capabilities,
    enabledModules,
    businessPreset: capabilities.data?.businessPreset ?? null,
    businessVertical: capabilities.data?.businessVertical ?? "general",
    verificationStatus: capabilities.data?.verificationStatus ?? "unverified",
    hasModule,
  };
}
