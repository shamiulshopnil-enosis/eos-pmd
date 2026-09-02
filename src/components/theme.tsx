"use client";

import { useSyncExternalStore } from "react";
import { Button } from "primereact/button";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

/** Light/dark switch — a PrimeReact icon button. The no-flash script in the
 *  root layout has already set the class from localStorage or the OS setting. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("eos-theme", next ? "dark" : "light");
    } catch {
      /* private mode — session-only is fine */
    }
  }

  return (
    <Button
      type="button"
      text
      rounded
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      icon={`pi ${dark ? "pi-sun" : "pi-moon"}`}
      className={`eos-icon-btn ${className}`.trim()}
    />
  );
}
