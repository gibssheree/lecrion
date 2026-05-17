import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import type { PermissionKey } from "../../hooks/usePermissions";

interface Props {
  permission: PermissionKey;
  children: ReactNode;
  fallbackPath?: string;
}

export default function PermissionGuard({
  permission,
  children,
  fallbackPath = "/dashboard",
}: Props) {
  const permissions = usePermissions();

  if (permissions[permission] !== true) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
