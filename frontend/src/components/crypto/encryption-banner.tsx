"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, KeyRound, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEncryptionStore } from "@/stores/encryption-store";
import { EncryptionOnboardingModal } from "./encryption-onboarding-modal";
import { EncryptionDialog } from "./encryption-dialog";

export function EncryptionBanner() {
  const isUnlocked = useEncryptionStore((state) => state.isUnlocked);
  const userMetadata = useEncryptionStore((state) => state.userMetadata);

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);

  // If already unlocked, render subtle green status pill
  if (isUnlocked) {
    return (
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">
            Zero-Knowledge E2EE Active — Your screenplays are encrypted with client-side AES-256-GCM.
          </span>
        </div>
        <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">
          Keys in Memory
        </span>
      </div>
    );
  }

  // If user has not configured encryption metadata yet
  if (!userMetadata) {
    return (
      <>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
          <div className="flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">
                Set up Zero-Knowledge Encryption
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Protect your creative intellectual property. Only your browser holds the decryption keys.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setOnboardingOpen(true)}
            className="h-8 text-xs font-medium gap-1.5 shrink-0"
          >
            <Lock className="w-3 h-3" />
            <span>Enable Encryption</span>
          </Button>
        </div>

        <EncryptionOnboardingModal
          open={onboardingOpen}
          onOpenChange={setOnboardingOpen}
        />
      </>
    );
  }

  // If user has metadata but the session is currently locked
  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              Encryption Session Locked
            </p>
            <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              Enter your master encryption passphrase to decrypt and edit your screenplays.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setUnlockDialogOpen(true)}
          className="h-8 text-xs font-medium gap-1.5 border-amber-500/30 hover:bg-amber-500/20 shrink-0"
        >
          <Unlock className="w-3 h-3" />
          <span>Unlock Studio</span>
        </Button>
      </div>

      <EncryptionDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        mode="unlock"
        userMetadata={userMetadata}
      />
    </>
  );
}
