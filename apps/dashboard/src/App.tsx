import "./index.css";
import { AppProviders } from "./app/AppProviders";
import { AuthProvider, useAuth } from "./store/auth.store";
import { AppRoutes } from "./routes/AppRoutes";
import { LoadingState } from "./components/ui/LoadingState";
import { LoginScreen } from "./components/layout/LoginScreen";

/**
 * AuthGate — reads auth state from the store and decides what to render.
 * Must be inside <AuthProvider>.
 */
function AuthGate() {
  const { authed } = useAuth();

  if (authed === null) return <LoadingState message="Memeriksa sesi…" />;
  if (!authed) return <LoginScreen />;

  return <AppRoutes />;
}

/**
 * App — thin root component.
 * Wires providers and delegates everything else.
 */
export default function App() {
  return (
    <AppProviders>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </AppProviders>
  );
}
