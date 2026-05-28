// PosAppShell — backwards-compatible thin wrapper.
//
// The full application shell (navbar, sidebar, breadcrumb, etc.) lives in
// PosLayout, which is mounted ONCE as a layout route. This component preserves
// the legacy API (`<PosAppShell title="…">{children}</PosAppShell>`) so existing
// pages don't need to be rewritten:
//
//   - `title`   → registered with PageTitleContext (read by PosLayout's heading)
//   - children  → rendered directly into the layout's content area via <Outlet />
//
// This eliminates the flicker that happened when each page rendered its own
// shell on every navigation: now only the children swap; navbar & sidebar stay.

import { ReactNode } from "react";
import { usePageTitle } from "../../app/PageTitleContext";

interface Props {
  children: ReactNode;
  title?: string;
}

export default function PosAppShell({ children, title = "" }: Props) {
  usePageTitle(title);
  return <>{children}</>;
}
