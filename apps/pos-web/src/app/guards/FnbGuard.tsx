import { ReactNode } from "react";
import ModuleGuard from "./ModuleGuard";

export default function FnbGuard({ children }: { children: ReactNode }) {
  return <ModuleGuard requiredModule="fnb.kds">{children}</ModuleGuard>;
}
