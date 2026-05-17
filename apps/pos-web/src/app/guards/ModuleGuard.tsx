import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useStoreCapabilities } from "../../hooks/useStoreCapabilities";

interface Props {
  requiredModule: string;
  children: ReactNode;
}

export default function ModuleGuard({ requiredModule, children }: Props) {
  const { hasModule, loading } = useStoreCapabilities();

  if (loading) {
    return (
      <div className="pos-page-body">
        <div className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  if (!hasModule(requiredModule)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
