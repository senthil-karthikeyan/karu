"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "./query-provider";
import { HotkeysProvider } from "@tanstack/react-hotkeys";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <HotkeysProvider>
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </HotkeysProvider>
    </QueryProvider>
  );
}
