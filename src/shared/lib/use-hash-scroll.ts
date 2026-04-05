import { useEffect } from "react";

/** Scroll to `location.hash` element on mount and on `hashchange` (client navigations). */
export function useHashScroll() {
  useEffect(() => {
    const run = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    };
    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, []);
}
