import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import AppProviders from "./app/AppProviders";
import Toaster from "./components/ui/Toaster";

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <Toaster />
    </AppProviders>
  );
}
