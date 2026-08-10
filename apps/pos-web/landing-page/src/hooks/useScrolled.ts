import { useEffect, useState } from "react";

/**
 * True once the landing page's scroll container has moved past `threshold`.
 *
 * Listens on `.landing-page` itself, not `window` — the page scrolls inside
 * that element (see base.css), so window scroll events never fire here.
 */
export function useScrolled(threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = document.querySelector(".landing-page");
    if (!root) return;

    const onScroll = () => setScrolled(root.scrollTop > threshold);
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
