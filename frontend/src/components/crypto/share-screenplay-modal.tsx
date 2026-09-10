"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Share2,
  Users,
  UserPlus,
  Trash2,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEncryptionStore } from "@/stores/encryption-store";
import { wrapKeyWithECIES } from "@/lib/crypto/ecies";
import { authApi } from "@/lib/api/auth";
import { screenplaysApi } from "@/lib/api/screenplays";
import type { ScreenplayCollaborator } from "@/lib/crypto/crypto-types";

interface ShareScreenplayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
  screenplayTitle?: string;
}

export function ShareScreenplayModal({
  open,
  onOpenChange,
  screenplayId,
  screenplayTitle = "Screenplay",
}: ShareScreenplayModalProps) {
  const [activeTab, setActiveTab] = useState<"invite" | "collaborators">("invite");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCollaborators, setIsFetchingCollaborators] = useState(false);
  const [collaborators, setCollaborators] = useState<ScreenplayCollaborator[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isUnlocked = useEncryptionStore((state) => state.isUnlocked);
  const sck = useEncryptionStore(
    (state) => state.screenplayKeys[screenplayId]
  );

  const fetchCollaborators = async () => {
    if (!screenplayId) return;
    setIsFetchingCollaborators(true);
    try {
      const data = await screenplaysApi.listCollaborators(screenplayId);
      setCollaborators(data);
    } catch (err) {
      console.error("Failed to fetch collaborators:", err);
    } finally {
      setIsFetchingCollaborators(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const init = async () => {
      await Promise.resolve();
      if (!mounted) return;
      setError(null);
      setEmail("");
      fetchCollaborators();
    };
    init();
    return () => {
      mounted = false;
    };
  }, [open, screenplayId]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError("Please enter a collaborator's email address.");
      return;
    }

    if (!isUnlocked || !sck) {
      setError("Encryption is locked. Please enter your encryption passphrase to unlock before sharing.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Lookup recipient user
      let recipient;
      try {
        recipient = await authApi.lookupUserByEmail(targetEmail);
      } catch {
        throw new Error(`User with email "${targetEmail}" was not found.`);
      }

      if (!recipient || !recipient.id) {
        throw new Error(`User with email "${targetEmail}" was not found.`);
      }

      // 2. Fetch recipient public key
      let pubKeyResp;
      try {
        pubKeyResp = await authApi.getUserPublicKey(recipient.id);
      } catch {
        throw new Error(
          `User "${targetEmail}" has not set up screenplay encryption yet.`
        );
      }

      if (!pubKeyResp || !pubKeyResp.publicKey) {
        throw new Error(
          `User "${targetEmail}" has not set up screenplay encryption yet.`
        );
      }

      // 3. Wrap SCK with ECIES P-256 AES-GCM
      const eciesPayload = await wrapKeyWithECIES(pubKeyResp.publicKey, sck);

      // 4. Submit share request to backend
      await screenplaysApi.shareScreenplay(screenplayId, {
        recipientUserId: recipient.id,
        role,
        ephemeralPublicKey: eciesPayload.ephemeralPublicKey,
        keyIv: eciesPayload.iv,
        wrappedKey: eciesPayload.wrappedKey,
        algorithm: eciesPayload.algorithm,
        version: eciesPayload.version,
      });

      toast.success(`Screenplay shared with ${targetEmail}!`, {
        description: `Granted ${role} role. Screenplay is securely shared.`,
      });

      setEmail("");
      setActiveTab("collaborators");
      await fetchCollaborators();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to share screenplay.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (userId: string, userEmail: string) => {
    try {
      await screenplaysApi.revokeCollaborator(screenplayId, userId);
      toast.success(`Access revoked for ${userEmail}`);
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to revoke collaborator.";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border bg-background">
        {/* Header */}
        <div className="bg-muted/40 p-6 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Share Screenplay
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {screenplayTitle} • Protected Collaboration
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border/60 -mb-6 mt-4 gap-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setActiveTab("invite");
                setError(null);
              }}
              className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "invite"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("collaborators");
                setError(null);
                fetchCollaborators();
              }}
              className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "collaborators"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Collaborators ({collaborators.length})
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {activeTab === "invite" ? (
            <form onSubmit={handleShare} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="share-email" className="text-xs font-semibold">
                  Collaborator Email
                </Label>
                <Input
                  id="share-email"
                  type="email"
                  placeholder="collaborator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="share-role" className="text-xs font-semibold">
                  Permission Role
                </Label>
                <Select
                  value={role}
                  onValueChange={(val) => {
                    if (val === "editor" || val === "viewer") setRole(val);
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger id="share-role" className="h-9">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Editor</span>
                        <span className="text-xs text-muted-foreground">
                          — Can edit & autosave screenplay
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Viewer</span>
                        <span className="text-xs text-muted-foreground">
                          — Read-only decryption access
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your screenplay will be securely shared directly with the recipient.
                  Only they can unlock and view your script.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2.5 text-xs text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading || !email.trim()}
                  className="gap-1.5"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  Share Screenplay
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {isFetchingCollaborators ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading collaborators...
                </div>
              ) : collaborators.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    No collaborators have access to this screenplay yet.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("invite")}
                    className="text-xs"
                  >
                    Invite your first collaborator
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {collaborators.map((c) => (
                    <div
                      key={c.userId}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-8 h-8 text-xs font-semibold">
                          <AvatarFallback>
                            {(c.name || c.email || "?")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {c.name || c.email}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={c.role === "owner" ? "default" : "secondary"}
                          className="text-[10px] capitalize px-2 py-0.5"
                        >
                          {c.role}
                        </Badge>
                        {c.role !== "owner" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevoke(c.userId, c.email)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Revoke collaborator access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
