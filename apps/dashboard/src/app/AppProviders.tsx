import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary";

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders — wraps the app in all top-level providers.
 *
 * Current providers:
 *   - ErrorBoundary: catches unhandled render errors
 *   - BrowserRouter: URL-based routing
 *
 * Add new providers here (e.g. ThemeProvider, QueryClient) as they become needed.
 * Keep this file thin — it is a wiring point, not a logic layer.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <BrowserRouter>{children}</BrowserRouter>
    </ErrorBoundary>
  );
}
