import { getStoreCapabilities } from "../services/api";
import { useApi } from "./useApi";
import { useSupportPreviewStore } from "../store/support-preview.store";

const CORE_MODULE_PREFIX = "core.";

export function useStoreCapabilities() {
  const capabilities = useApi(getStoreCapabilities, [], { autoRefreshMs: 0 });
  const isPreviewActive = useSupportPreviewStore((s) => s.isPreviewActive);
  const activeVerticalKey = useSupportPreviewStore((s) => s.activeVerticalKey);
  const activePreset = useSupportPreviewStore((s) => s.activePreset);

  const enabledModules = capabilities.data?.enabledModules ?? [];

  function hasModule(moduleKey: string): boolean {
    if (isPreviewActive) return true;
    if (enabledModules.includes(moduleKey)) return true;
    return capabilities.loading && moduleKey.startsWith(CORE_MODULE_PREFIX);
  }

  return {
    ...capabilities,
    enabledModules,
    businessPreset: isPreviewActive ? activePreset : (capabilities.data?.businessPreset ?? null),
    businessVertical: isPreviewActive ? (activeVerticalKey ?? "general") : (capabilities.data?.businessVertical ?? "general"),
    verificationStatus: isPreviewActive ? "verified" : (capabilities.data?.verificationStatus ?? "unverified"),
    hasModule,
  };
}
