import { getStoreInfo } from "../services/api";
import { useApi } from "./useApi";

export function useStoreInfo() {
  const storeInfo = useApi(getStoreInfo, [], { autoRefreshMs: 0 });
  const isFnb = storeInfo.data?.isFnb === true;

  return {
    ...storeInfo,
    businessType: storeInfo.data?.businessType ?? "general",
    isFnb,
  };
}
