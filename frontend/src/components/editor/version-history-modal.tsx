"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, Plus, RotateCcw, Lock, Calendar, Sparkles, Loader2, FileText } from "lucide-react";
import {
  screenplaysApi,
  type ScreenplayVersionResponse,
} from "@/lib/api/screenplays";
import { useEncryptionStore } from "@/stores/encryption-store";
import { formatRelativeTime } from "@/lib/date";
import type { Editor } from "@tiptap/react";
import type { TipTapDocumentJSON } from "@/lib/crypto";
import { normalizeScreenplayDoc } from "./screenplay-extensions";

interface VersionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenplayId: string;
  projectId: string;
  editor: Editor | null;
  onVersionRestored: (newRevision: number) => void;
}

export function VersionHistoryModal({
  open,
  onOpenChange,
  screenplayId,
  projectId,
  editor,
  onVersionRestored,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<ScreenplayVersionResponse[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ScreenplayVersionResponse | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [newVersionTitle, setNewVersionTitle] = useState("");
  const [showCreateInput, setShowCreateInput] = useState(false);

  const screenplayKey = useEncryptionStore(
    (state) => state.screenplayKeys[screenplayId] || state.screenplayKeys[projectId]
  );
  const isUnlocked = useEncryptionStore((state) => state.isUnlocked);

  const loadVersions = useCallback(async () => {
    if (!screenplayId) return;
    setIsLoading(true);
    try {
      const list = await screenplaysApi.listVersions(screenplayId);
      setVersions(list);
      if (list.length > 0 && !selectedVersion) {
        setSelectedVersion(list[0]);
      }
    } catch (err) {
      console.error("Failed to load versions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [screenplayId, selectedVersion]);

  useEffect(() => {
    if (open) {
      loadVersions();
    } else {
      setShowCreateInput(false);
      setNewVersionTitle("");
      setPreviewContent(null);
    }
  }, [open, loadVersions]);

  // Load and decrypt preview content when selected version changes
  useEffect(() => {
    if (!selectedVersion || !open) return;

    let mounted = true;
    const fetchPreview = async () => {
      try {
        if (screenplayKey) {
          const { doc } = await screenplaysApi.getDecryptedVersion(
            screenplayId,
            selectedVersion.id,
            screenplayKey
          );
          if (mounted) {
            // Render basic text representation for preview
            const textLines = (doc.content || []).map((node) => {
              const text = (node.content || []).map((c) => c.text || "").join("");
              return text;
            });
            setPreviewContent(textLines.join("\n\n"));
          }
        } else {
          const ver = await screenplaysApi.getVersion(screenplayId, selectedVersion.id);
          if (mounted) {
            setPreviewContent(ver.content || "");
          }
        }
      } catch (err) {
        if (mounted) {
          setPreviewContent("🔒 Encrypted snapshot content. Unlock session to preview.");
        }
      }
    };

    fetchPreview();
    return () => {
      mounted = false;
    };
  }, [selectedVersion, screenplayId, screenplayKey, open]);

  const handleCreateVersion = async () => {
    if (!editor || !newVersionTitle.trim() || !screenplayId) return;
    setIsCreating(true);
    try {
      const title = newVersionTitle.trim();
      if (screenplayKey) {
        const json = editor.getJSON() as TipTapDocumentJSON;
        await screenplaysApi.createEncryptedVersion(screenplayId, title, json, screenplayKey);
      } else {
        const html = editor.getHTML();
        await screenplaysApi.createVersion(screenplayId, { title, content: html });
      }
      setNewVersionTitle("");
      setShowCreateInput(false);
      await loadVersions();
    } catch (err) {
      console.error("Failed to create version snapshot:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreVersion = async () => {
    if (!selectedVersion || !editor || !screenplayId) return;
    setIsRestoring(true);
    try {
      const res = await screenplaysApi.restoreVersion(screenplayId, selectedVersion.id);
      
      // Decrypt and set editor content
      if (screenplayKey) {
        const { doc } = await screenplaysApi.getDecryptedVersion(
          screenplayId,
          selectedVersion.id,
          screenplayKey
        );
        const normalized = normalizeScreenplayDoc(doc);
        editor.commands.setContent(normalized);
      } else {
        editor.commands.setContent(res.content);
      }

      onVersionRestored(res.newRevision);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to restore version snapshot:", err);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 border-b border-border/80 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <History className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Version History & Checkpoints
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Browse immutable encrypted revisions, create named checkpoints, and restore past drafts.
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setShowCreateInput((prev) => !prev)}
              className="gap-1.5 text-xs font-medium h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Checkpoint</span>
            </Button>
          </div>

          {/* New Checkpoint Input Bar */}
          {showCreateInput && (
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 animate-in fade-in-50 duration-200">
              <Input
                placeholder="e.g. Draft 1.0 (Table Read Ready)..."
                value={newVersionTitle}
                onChange={(e) => setNewVersionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateVersion();
                }}
                className="text-xs h-9"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleCreateVersion}
                disabled={!newVersionTitle.trim() || isCreating}
                className="h-9 text-xs gap-1.5 shrink-0"
              >
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Save Checkpoint
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Modal Body: Left Version List + Right Snapshot Preview */}
        <div className="flex flex-1 overflow-hidden min-h-[400px]">
          {/* Left Column: Version History List */}
          <div className="w-80 border-r border-border overflow-y-auto p-4 space-y-2 bg-muted/20 shrink-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs">Loading versions...</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2 px-4">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-xs font-medium">No checkpoints saved yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Create a checkpoint to bookmark this screenplay draft milestone.
                </p>
              </div>
            ) : (
              versions.map((ver) => {
                const isSelected = selectedVersion?.id === ver.id;
                return (
                  <div
                    key={ver.id}
                    onClick={() => setSelectedVersion(ver)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-foreground"
                        : "bg-background border-border/60 hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                          v{ver.versionNumber}
                        </Badge>
                        <span className="font-semibold text-xs text-foreground truncate max-w-[140px]">
                          {ver.title}
                        </span>
                      </div>
                      {screenplayKey && (
                        <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatRelativeTime(ver.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Version Preview & Restore Action */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {selectedVersion ? (
              <>
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <span>{selectedVersion.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        Version {selectedVersion.versionNumber}
                      </Badge>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Created {formatRelativeTime(selectedVersion.createdAt)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleRestoreVersion}
                    disabled={isRestoring}
                    className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isRestoring ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    <span>Restore this Version</span>
                  </Button>
                </div>

                {/* Readonly Screenplay Preview Box */}
                <div className="flex-1 overflow-y-auto p-6 font-screenplay text-[13px] leading-relaxed whitespace-pre-wrap text-muted-foreground bg-muted/5">
                  {previewContent ? (
                    previewContent
                  ) : (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                Select a version on the left to preview content.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
