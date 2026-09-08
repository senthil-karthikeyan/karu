"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  Loader2,
  LifeBuoy,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEncryptionStore } from "@/stores/encryption-store";
import { useAuth } from "@/hooks/use-auth";
import type { UserEncryptionMetadata } from "@/lib/crypto";

interface EncryptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "setup" | "unlock";
  userMetadata?: UserEncryptionMetadata | null;
  onSuccess?: () => void | Promise<void>;
}

export function EncryptionDialog({
  open,
  onOpenChange,
  mode = "unlock",
  userMetadata,
  onSuccess,
}: EncryptionDialogProps) {
  const { user } = useAuth();
  const setupNewSecret = useEncryptionStore((state) => state.setupNewSecret);
  const unlockWithSecret = useEncryptionStore((state) => state.unlockWithSecret);
  const resetPassphraseWithRecovery = useEncryptionStore(
    (state) => state.resetPassphraseWithRecovery
  );
  const storeMetadata = useEncryptionStore((state) => state.userMetadata);

  const [secret, setSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeMetadata = userMetadata || storeMetadata;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRecovering) {
      if (!recoveryCode.trim()) {
        setError("Please enter your Emergency Recovery Code.");
        return;
      }
      if (!secret || secret.length < 8) {
        setError("New passphrase must be at least 8 characters long.");
        return;
      }
      if (secret !== confirmSecret) {
        setError("New passphrases do not match.");
        return;
      }

      if (!user?.email) {
        setError("User email address could not be determined.");
        return;
      }

      setIsLoading(true);
      try {
        await resetPassphraseWithRecovery(user.email, recoveryCode, secret);
        toast.success("Passphrase reset successfully! Session unlocked.");
        if (onSuccess) {
          await onSuccess();
        }
        setSecret("");
        setConfirmSecret("");
        setRecoveryCode("");
        setIsRecovering(false);
        onOpenChange(false);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to reset passphrase with recovery code."
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!secret || secret.length < 8) {
      setError("Encryption secret must be at least 8 characters long.");
      return;
    }

    if (mode === "setup") {
      if (secret !== confirmSecret) {
        setError("Encryption secrets do not match.");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === "setup") {
        await setupNewSecret(secret);
      } else {
        if (!activeMetadata) {
          await setupNewSecret(secret);
        } else {
          await unlockWithSecret(secret, activeMetadata);
        }
      }

      if (onSuccess) {
        await onSuccess();
      }

      useEncryptionStore.setState({ isUnlocked: true });
      setSecret("");
      setConfirmSecret("");
      onOpenChange(false);
    } catch {
      useEncryptionStore.setState({ isUnlocked: false, activeUEK: null });
      setError("Invalid encryption secret. Please verify your passphrase.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
              {isRecovering ? (
                <LifeBuoy className="w-6 h-6" />
              ) : mode === "setup" ? (
                <KeyRound className="w-6 h-6" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>
            <DialogTitle className="text-center text-xl">
              {isRecovering
                ? "Recover Encryption Access"
                : mode === "setup"
                  ? "Protect Your Screenplay"
                  : "Unlock Screenplay"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground pt-1">
              {isRecovering
                ? "Enter your Emergency Recovery Code to reset your encryption passphrase."
                : mode === "setup"
                  ? "Create a client-side encryption secret. Your screenplay will be encrypted in your browser using AES-GCM (256-bit)."
                  : "Enter your encryption secret to decrypt and edit this screenplay."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isRecovering ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recovery-code" className="text-xs font-semibold">
                    Emergency Recovery Code
                  </Label>
                  <Input
                    id="recovery-code"
                    placeholder="KARU-XXXX-XXXX-XXXX-..."
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    autoFocus
                    disabled={isLoading}
                    className="font-mono uppercase text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-secret" className="text-xs font-semibold">
                    New Encryption Passphrase
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-secret"
                      type={showSecret ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-secret" className="text-xs font-semibold">
                    Confirm New Passphrase
                  </Label>
                  <Input
                    id="confirm-new-secret"
                    type={showSecret ? "text" : "password"}
                    placeholder="Repeat new passphrase"
                    value={confirmSecret}
                    onChange={(e) => setConfirmSecret(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </>
            ) : (
              <>
                {mode === "setup" && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Important:</strong> We cannot recover this secret for you. If lost, you must
                      use your Emergency Recovery Code.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="encryption-secret">Encryption Secret</Label>
                  <div className="relative">
                    <Input
                      id="encryption-secret"
                      type={showSecret ? "text" : "password"}
                      placeholder={mode === "setup" ? "Enter a strong passphrase" : "Enter your secret"}
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      autoFocus
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === "setup" && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-encryption-secret">Confirm Encryption Secret</Label>
                    <Input
                      id="confirm-encryption-secret"
                      type={showSecret ? "text" : "password"}
                      placeholder="Repeat your passphrase"
                      value={confirmSecret}
                      onChange={(e) => setConfirmSecret(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {mode === "unlock" && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecovering(true);
                        setError(null);
                      }}
                      className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <LifeBuoy className="w-3 h-3" />
                      Forgot passphrase? Use Recovery Code
                    </button>
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-between flex-row gap-2">
            {isRecovering ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsRecovering(false);
                  setError(null);
                }}
                disabled={isLoading}
                className="gap-1 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to unlock
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRecovering
                ? "Reset & Unlock"
                : mode === "setup"
                  ? "Enable Encryption"
                  : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
