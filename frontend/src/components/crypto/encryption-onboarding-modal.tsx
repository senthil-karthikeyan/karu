"use client";

import { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  Download,
  Copy,
  Check,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useEncryptionStore } from "@/stores/encryption-store";
import { useAuthStore } from "@/stores/auth-store";
import { generateEmergencyRecoveryKey, downloadRecoveryKit } from "@/lib/crypto/recovery";

interface EncryptionOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EncryptionOnboardingModal({
  open,
  onOpenChange,
  onSuccess,
}: EncryptionOnboardingModalProps) {
  const user = useAuthStore((state) => state.user);
  const setupNewSecret = useEncryptionStore((state) => state.setupNewSecret);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [secret, setSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [downloadedKit, setDownloadedKit] = useState(false);
  const [confirmedBackup, setConfirmedBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStep1Next = () => {
    setError(null);
    if (!secret || secret.length < 8) {
      setError("Encryption passphrase must be at least 8 characters long.");
      return;
    }
    if (secret !== confirmSecret) {
      setError("Encryption passphrases do not match.");
      return;
    }
    if (!recoveryKey) {
      setRecoveryKey(generateEmergencyRecoveryKey());
    }
    setStep(2);
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopiedKey(true);
      toast.success("Recovery Code copied to clipboard!");
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownloadKit = () => {
    downloadRecoveryKit(recoveryKey, user?.email || "writer@karu.app");
    setDownloadedKit(true);
    toast.success("Recovery code downloaded successfully!");
  };

  const handleFinalizeSetup = async () => {
    setError(null);
    if (!confirmedBackup && !downloadedKit) {
      setError("Please confirm you have saved or downloaded your Recovery Code.");
      return;
    }

    setIsLoading(true);
    setStep(3);

    try {
      await setupNewSecret(secret, recoveryKey);
      toast.success("Protection Activated!", {
        description: "Your screenplays are now protected.",
      });

      if (onSuccess) {
        await onSuccess();
      }

      setTimeout(() => {
        setIsLoading(false);
        onOpenChange(false);
      }, 600);
    } catch (err) {
      setIsLoading(false);
      setStep(2);
      setError(err instanceof Error ? err.message : "Failed to initialize encryption.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border bg-background">
        {/* Header Banner */}
        <div className="bg-muted/40 p-6 border-b border-border/80 text-center relative">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
            {step === 1 ? (
              <KeyRound className="w-6 h-6" />
            ) : step === 2 ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6 animate-pulse" />
            )}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {step === 1
              ? "Protect Your Screenplays"
              : step === 2
                ? "Save Your Recovery Code"
                : "Securing Your Workspace..."}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {step === 1
              ? "Create an encryption passphrase to protect your screenplays. You'll need this passphrase to unlock your work."
              : step === 2
                ? "Your recovery code is your safeguard if you ever forget your encryption passphrase."
                : "Setting up your encryption passphrase..."}
          </DialogDescription>
        </div>

        {/* Step 1: Create Encryption Passphrase */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-foreground/80 space-y-1">
              <p className="font-semibold text-primary">Private & Protected</p>
              <p className="text-muted-foreground leading-relaxed">
                Your encryption passphrase stays private to you. Only you can unlock and read your screenplays.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="master-passphrase" className="text-xs font-semibold">
                  Encryption Passphrase
                </Label>
                <div className="relative">
                  <Input
                    id="master-passphrase"
                    type={showSecret ? "text" : "password"}
                    placeholder="Enter your encryption passphrase (min. 8 characters)"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="pr-10 text-sm h-10"
                    autoFocus
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

              <div className="space-y-1.5">
                <Label htmlFor="confirm-master-passphrase" className="text-xs font-semibold">
                  Confirm Encryption Passphrase
                </Label>
                <Input
                  id="confirm-master-passphrase"
                  type={showSecret ? "text" : "password"}
                  placeholder="Confirm your encryption passphrase"
                  value={confirmSecret}
                  onChange={(e) => setConfirmSecret(e.target.value)}
                  className="text-sm h-10"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20 font-medium">
                {error}
              </p>
            )}

            <DialogFooter className="pt-2 sm:justify-between flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9"
              >
                Skip for Now
              </Button>
              <Button onClick={handleStep1Next} className="text-xs h-9 gap-1.5 font-medium">
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Recovery Code */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recovery Code
              </Label>
              <div className="p-3 bg-muted/60 border border-border rounded-lg flex items-center justify-between font-mono text-sm tracking-wider select-all font-bold text-foreground">
                <span>{recoveryKey}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyKey}
                  className="h-7 px-2 text-xs gap-1"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadKit}
                className="w-full text-xs h-9 gap-2 border-border"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadedKit ? "Code Downloaded (.txt)" : "Download Recovery Code (.txt)"}</span>
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
              <div className="space-y-1">
                <p className="font-semibold">⚠️ Keep This Code Safe</p>
                <p className="leading-relaxed text-[11px]">
                  If you forget your encryption passphrase, this recovery code is the only way to regain access to your screenplays.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="backup-confirm"
                checked={confirmedBackup}
                onCheckedChange={(c) => setConfirmedBackup(!!c)}
                className="mt-0.5"
              />
              <Label htmlFor="backup-confirm" className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                I have saved my Recovery Code in a safe place.
              </Label>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20 font-medium">
                {error}
              </p>
            )}

            <DialogFooter className="pt-2 sm:justify-between flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="text-xs h-9"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handleFinalizeSetup}
                disabled={isLoading || (!confirmedBackup && !downloadedKit)}
                className="text-xs h-9 gap-1.5 font-medium"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Protect Screenplays</span>
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Key Derivation in progress */}
        {step === 3 && (
          <div className="p-10 flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Securing Your Workspace...</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Setting up your encryption passphrase...
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
