// store/index.ts
// Global state slices — only for state that must survive route changes
// or be shared broadly across the component tree.
//
// Current slices:
//   auth — session state (authed, userEmail, login/logout actions)
//
// Not here:
//   orders, products, reports — these are server data, kept in page hooks
//   form state — kept in page components
//   page-specific UI state — kept in page components

export { AuthProvider, useAuth } from "./auth.store";
export type { AuthState } from "./auth.store";
