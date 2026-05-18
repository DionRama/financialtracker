"use client";

import { Toaster as SonnerToaster } from "sonner";

import { useTheme } from "@/components/theme-provider";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme}
      richColors
      closeButton
      position="top-right"
    />
  );
}
