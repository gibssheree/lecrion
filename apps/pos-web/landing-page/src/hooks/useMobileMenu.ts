import { useEffect, useState } from "react";

export function useMobileMenu() {
  const [open, setOpen] = useState(false);

  // The landing root is the scroll container, not <body> — pos-web keeps
  // html/body/#root at overflow:hidden. Locking body here would be a no-op.
  useEffect(() => {
    const root = document.querySelector(".landing-page");
    if (!root) return;
    root.classList.toggle("is-locked", open);
    return () => root.classList.remove("is-locked");
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen, toggle: () => setOpen((v) => !v) };
}
