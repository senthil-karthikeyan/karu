"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
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

interface ChangePassphraseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangePassphraseModal({
  open,
  onOpenChange,
  onSuccess,
}: ChangePassphraseModalProps) {
  const changePassphrase = useEncryptionStore((state) => state.changePassphrase);

  const [currentPassphrase, setCurrentPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setCurrentPassphrase("");
    setNewPassphrase("");
    setConfirmPassphrase("");
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassphrase) {
      setError("Please enter your current encryption passphrase.");
      return;
    }

    if (!newPassphrase || newPassphrase.length < 8) {
      setError("New encryption passphrase must be at least 8 characters long.");
      return;
    }

    if (newPassphrase !== confirmPassphrase) {
      setError("New encryption passphrases do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await changePassphrase(currentPassphrase, newPassphrase);
      toast.success("Encryption passphrase changed successfully!");
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        !msg ||
        msg.toLowerCase().includes("incorrect") ||
        msg.toLowerCase().includes("password") ||
        msg.toLowerCase().includes("passphrase") ||
        msg.toLowerCase().includes("operation") ||
        msg.toLowerCase().includes("tag") ||
        msg.toLowerCase().includes("unwrap")
      ) {
        setError("Incorrect encryption passphrase. Please try again.");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-xl">
              Change Encryption Passphrase
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground pt-1">
              Enter your current encryption passphrase, then choose a new one to protect your screenplays.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-passphrase" className="text-xs font-semibold">
                Current Encryption Passphrase
              </Label>
              <div className="relative">
                <Input
                  id="current-passphrase"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current passphrase"
                  value={currentPassphrase}
                  onChange={(e) => setCurrentPassphrase(e.target.value)}
                  autoFocus
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-passphrase" className="text-xs font-semibold">
                New Encryption Passphrase
              </Label>
              <div className="relative">
                <Input
                  id="new-passphrase"
                  type={showNew ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-passphrase" className="text-xs font-semibold">
                Confirm New Encryption Passphrase
              </Label>
              <Input
                id="confirm-new-passphrase"
                type={showNew ? "text" : "password"}
                placeholder="Repeat new passphrase"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
              <p
                id="change-passphrase-error"
                className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20 font-medium"
              >
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-between flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Lock className="w-3.5 h-3.5" />
              <span>Change Passphrase</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
