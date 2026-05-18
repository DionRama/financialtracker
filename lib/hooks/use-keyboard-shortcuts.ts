"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const GO_TIMEOUT_MS = 800;

const goRoutes: Record<string, string> = {
  d: "/dashboard",
  e: "/expenses",
  i: "/income",
  b: "/budgets",
  g: "/goals",
  r: "/recurring",
  c: "/categories",
  a: "/analytics",
  s: "/settings",
};

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let goPending = false;
    let goTimer: ReturnType<typeof setTimeout> | null = null;

    function resetGo() {
      goPending = false;
      if (goTimer) {
        clearTimeout(goTimer);
        goTimer = null;
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();

      if (goPending) {
        const path = goRoutes[key];
        resetGo();
        if (path) {
          e.preventDefault();
          router.push(path);
        }
        return;
      }

      if (key === "g") {
        goPending = true;
        goTimer = setTimeout(resetGo, GO_TIMEOUT_MS);
        return;
      }

      if (key === "n") {
        e.preventDefault();
        router.push("/expenses?new=1");
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      resetGo();
    };
  }, [router]);
}
