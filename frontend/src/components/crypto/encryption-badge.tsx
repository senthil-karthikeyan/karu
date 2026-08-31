"use client";

import { ShieldCheck, ShieldAlert, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEncryptionStore } from "@/stores/encryption-store";

interface EncryptionBadgeProps {
  screenplayId?: string;
  className?: string;
}

export function EncryptionBadge({ screenplayId, className }: EncryptionBadgeProps) {
  const isUnlocked = useEncryptionStore((state) => state.isUnlocked);
  const screenplayKey = useEncryptionStore((state) =>
    screenplayId ? state.screenplayKeys[screenplayId] : undefined
  );

  const isScreenplayReady = isUnlocked && (!screenplayId || !!screenplayKey);

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger>
          <div className="inline-flex items-center">
            <Badge
              variant="outline"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium cursor-default select-none border transition-colors ${
                isScreenplayReady
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15"
              } ${className || ""}`}
            >
              {isScreenplayReady ? (
                <>
                  <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>E2EE Protected</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>E2EE Locked</span>
                </>
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3 text-xs space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            {isScreenplayReady ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Zero-Knowledge Encryption Active</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Encryption Session Locked</span>
              </>
            )}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {isScreenplayReady
              ? "Content is encrypted client-side using AES-GCM (256-bit). Only your browser holds the decryption keys."
              : "Enter your encryption secret to unlock and edit this screenplay."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
