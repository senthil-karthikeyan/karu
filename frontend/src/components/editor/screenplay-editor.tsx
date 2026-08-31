"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  Download,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { Project, SceneItem } from "@/types/screenplay";
import { useUpdateProjectMutation } from "@/hooks/use-projects";
import { screenplaysApi, type ScreenplayDetailResponse } from "@/lib/api/screenplays";
import { useEncryptionStore } from "@/stores/encryption-store";
import {
  parseEncryptedPayloadString,
  encryptScreenplayContent,
  decryptScreenplayContent,
  type TipTapDocumentJSON,
} from "@/lib/crypto";
import { EncryptionBadge } from "@/components/crypto/encryption-badge";
import { EncryptionDialog } from "@/components/crypto/encryption-dialog";
import { ScreenplayToolbar } from "./screenplay-toolbar";
import { SceneNavigator } from "./scene-navigator";
import { ExportModal } from "./export-modal";
import { ScreenplayAutocompletePopover } from "./screenplay-autocomplete";
import {
  ScreenplayNodes,
  ScreenplayShortcuts,
  ScreenplayAutoFormatting,
  ScreenplaySmartDetection,
  ScreenplayPasteHandler,
  ScreenplayPagination,
  normalizeScreenplayDoc,
  getActiveScreenplayType,
} from "./screenplay-extensions";
import type { ScreenplayElementType } from "@/types/screenplay";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/date";

interface ScreenplayEditorProps {
  project: Project;
}

function extractScenesFromHtml(html: string, fallbackScenes: SceneItem[]): SceneItem[] {
  const headingMatches = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
  if (headingMatches.length === 0) {
    return fallbackScenes.length > 0
      ? fallbackScenes
      : [
          {
            id: "sc-1",
            number: 1,
            slugline: "INT. OPENING SCENE - DAY",
            location: "OPENING SCENE",
            time: "DAY",
            pageNumber: 1,
          },
        ];
  }

  return headingMatches.map((m, idx) => {
    const rawText = m[1].replace(/<[^>]+>/g, "").trim();
    const cleanSlugline = rawText.replace(/^\d+\.\s*/, "").trim();
    const timeMatch = cleanSlugline.match(/(DAY|NIGHT|DAWN|DUSK|CONTINUOUS)/i);
    const time = (timeMatch ? timeMatch[0].toUpperCase() : "DAY") as SceneItem["time"];

    const existing = fallbackScenes[idx];
    return {
      id: existing?.id || `sc-dyn-${idx + 1}`,
      number: idx + 1,
      slugline: cleanSlugline || `SCENE ${idx + 1}`,
      location:
        cleanSlugline.split("-")[0]?.replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, "").trim() ||
        "LOCATION",
      time,
      summary: existing?.summary,
      pageNumber: existing?.pageNumber || Math.max(1, Math.ceil((idx * 3) + 1)),
    };
  });
}

export function ScreenplayEditor({ project }: ScreenplayEditorProps) {
  const updateProjectMutation = useUpdateProjectMutation(project.id);
  const isUnlocked = useEncryptionStore((state) => state.isUnlocked);

  const [screenplay, setScreenplay] = useState<ScreenplayDetailResponse | null>(null);
  const [activeScreenplayId, setActiveScreenplayId] = useState<string>(project.id);
  const [currentRevision, setCurrentRevision] = useState<number>(1);
  const screenplayKey = useEncryptionStore(
    (state) => state.screenplayKeys[activeScreenplayId] || state.screenplayKeys[project.id]
  );

  const [navigatorOpen, setNavigatorOpen] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [lastSaved, setLastSaved] = useState<Date>(new Date(project.updatedAt));
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [encryptionDialogOpen, setEncryptionDialogOpen] = useState(false);
  const [currentHtml, setCurrentHtml] = useState<string>(project.screenplayContent);
  const [activeSceneId, setActiveSceneId] = useState<string | undefined>(project.scenes[0]?.id);

  const [stats, setStats] = useState(project.stats);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic scenes computed from screenplay content
  const dynamicScenes = useMemo(() => {
    return extractScenesFromHtml(currentHtml, project.scenes);
  }, [currentHtml, project.scenes]);

  // Determine initial editor content (plaintext or decrypted JSON)
  const isEncryptedPayload = useMemo(() => {
    return !!parseEncryptedPayloadString(project.screenplayContent);
  }, [project.screenplayContent]);

  const initialContent = useMemo(() => {
    const parsedPayload = parseEncryptedPayloadString(project.screenplayContent);
    if (!parsedPayload) {
      return project.screenplayContent;
    }
    // If encrypted and not yet decrypted, show locked placeholder until unlocked
    return `<p data-type="action">🔒 Encrypted screenplay draft. Please unlock your encryption session to view and write.</p>`;
  }, [project.screenplayContent]);

  // Load canonical screenplay details on mount
  useEffect(() => {
    let mounted = true;
    screenplaysApi
      .getDefaultScreenplay(project.id)
      .then((sp) => {
        if (!mounted || !sp) return;
        setScreenplay(sp);
        setActiveScreenplayId(sp.id);
        if (sp.revision) {
          setCurrentRevision(sp.revision);
        }
      })
      .catch((err) => {
        console.debug("Default screenplay lookup:", err);
      });
    return () => {
      mounted = false;
    };
  }, [project.id]);

  // Initialize TipTap editor with semantic screenplay nodes and pagination
  const editor = useEditor({
    immediatelyRender: false,
    editable: !isEncryptedPayload || (isUnlocked && !!screenplayKey),
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
      }),
      ...ScreenplayNodes,
      ScreenplayAutoFormatting,
      ScreenplaySmartDetection,
      ScreenplayPasteHandler,
      ScreenplayShortcuts,
      ScreenplayPagination.configure({
        projectTitle: project.title,
        pageUsableHeight: 840,
        onPageCountChange: (pageCount) => {
          setStats((prev) => ({ ...prev, pageCount }));
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Write scene heading (e.g. INT. TRAIN COMPARTMENT - NIGHT)...",
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none w-full max-w-[820px] mx-auto text-[15px] leading-relaxed font-screenplay",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      // If locked/encrypted placeholder is active, do not trigger autosave
      if (isEncryptedPayload && !screenplayKey) {
        return;
      }

      const html = currentEditor.getHTML();
      setCurrentHtml(html);

      // Compute word count
      const text = currentEditor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setStats((prev) => ({ ...prev, wordCount: words }));

      // Debounce autosave to dedicated screenplay content endpoints
      setSaveStatus("saving");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const targetId = activeScreenplayId || project.id;
          let nextRevision = currentRevision;

          if (screenplayKey) {
            const json = currentEditor.getJSON() as TipTapDocumentJSON;
            const res = await screenplaysApi.saveEncryptedContent(
              targetId,
              json,
              screenplayKey,
              currentRevision
            );
            if (res && res.revision) {
              nextRevision = res.revision;
            }
          } else {
            const res = await screenplaysApi.saveContent(targetId, {
              content: html,
              revision: currentRevision,
            });
            if (res && res.revision) {
              nextRevision = res.revision;
            }
          }

          setCurrentRevision(nextRevision);
          setSaveStatus("saved");
          setLastSaved(new Date());

          // Non-blocking project metadata sync
          updateProjectMutation.mutate({
            id: project.id,
            data: {
              lastEditedScene: dynamicScenes[0]?.slugline || "INT. OPENING SCENE - DAY",
            },
          });
        } catch (err) {
          console.error("Autosave failed:", err);
          setSaveStatus("saved");
        }
      }, 1000);
    },
  });

  // Calculate word count from editor
  const currentWordCount = useMemo(() => {
    if (!editor) return stats.wordCount || 0;
    const text = editor.getText();
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [editor, stats.wordCount]);

  // Active element type
  const activeElementType = useMemo(() => {
    if (!editor) return "action";
    return getActiveScreenplayType(editor);
  }, [editor]);

  // Attempt to load metadata and decrypt on mount
  useEffect(() => {
    const isEncrypted = !!parseEncryptedPayloadString(project.screenplayContent);

    useEncryptionStore
      .getState()
      .fetchUserMetadata()
      .then(() => {
        if (isEncrypted && !isUnlocked) {
          setEncryptionDialogOpen(true);
        }
      });
  }, [project.screenplayContent, isUnlocked]);

  // When unlocked, load the wrapped key for this screenplay if not already in memory
  useEffect(() => {
    if (isUnlocked && !screenplayKey) {
      const targetId = activeScreenplayId || project.id;
      useEncryptionStore
        .getState()
        .loadAndUnlockScreenplayKey(targetId, project.id)
        .catch((err) => {
          console.debug("No existing wrapped key found or unable to unwrap:", err);
        });
    }
  }, [isUnlocked, screenplayKey, activeScreenplayId, project.id]);

  // Decrypt content when key becomes available in memory and unlock editor
  useEffect(() => {
    if (!editor || !screenplayKey) return;

    const rawContent = screenplay?.content || project.screenplayContent;
    const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    const parsedPayload = parseEncryptedPayloadString(contentStr);

    if (parsedPayload) {
      decryptScreenplayContent(parsedPayload, screenplayKey)
        .then((doc) => {
          const normalized = normalizeScreenplayDoc(doc);
          editor.commands.setContent(normalized);
          editor.setEditable(true);
        })
        .catch((err) => {
          console.error("Failed to decrypt initial content:", err);
        });
    } else {
      editor.setEditable(true);
    }
  }, [editor, screenplayKey, screenplay, project.screenplayContent]);

  // Handle format element buttons with semantic TipTap nodes
  const handleSetElementType = useCallback(
    (type: ScreenplayElementType) => {
      if (!editor) return;

      const nodeMap: Record<ScreenplayElementType, string> = {
        "scene-heading": "sceneHeading",
        action: "action",
        character: "character",
        dialogue: "dialogue",
        parenthetical: "parenthetical",
        transition: "transition",
        shot: "shot",
      };

      const targetNode = nodeMap[type] || "action";
      editor.chain().focus().setNode(targetNode).run();
    },
    [editor]
  );

  // Jump to scene in editor via accurate ProseMirror document AST search
  const handleSelectScene = (scene: SceneItem) => {
    setActiveSceneId(scene.id);
    if (!editor) return;

    const targetSlugline = scene.slugline.trim().toUpperCase();
    let targetPos: number | null = null;
    let targetLength = targetSlugline.length;

    editor.state.doc.descendants((node, pos) => {
      if (targetPos !== null) return false;
      const isHeading = node.type.name === "heading" || node.attrs?.dataType === "scene-heading";
      if (isHeading) {
        const nodeText = (node.textContent || "").trim().toUpperCase();
        if (
          nodeText === targetSlugline ||
          nodeText.includes(targetSlugline) ||
          targetSlugline.includes(nodeText)
        ) {
          targetPos = pos + 1;
          targetLength = node.textContent?.length || targetLength;
          return false;
        }
      }
    });

    if (targetPos !== null) {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: targetPos, to: targetPos + targetLength })
        .scrollIntoView()
        .run();
    }
  };

  const calculatedMinHeight =
    Math.max(1, stats.pageCount) * 1056 + (Math.max(1, stats.pageCount) - 1) * 44;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/30">
      {/* Top Editor Bar (Hidden in Zen Mode) */}
      {!zenMode && (
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 shrink-0 z-30">
          {/* Left: Back & Project Title */}
          <div className="flex items-center gap-3">
            <Link href={`/projects/${project.id}`}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium h-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </Button>
            </Link>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight truncate max-w-[180px] sm:max-w-xs">
                {project.title}
              </span>
              <div
                id="e2ee-encryption-badge"
                onClick={() => setEncryptionDialogOpen(true)}
                className="cursor-pointer"
              >
                <EncryptionBadge screenplayId={project.id} />
              </div>
            </div>
          </div>

          {/* Center: Save status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <CloudUpload className="h-3.5 w-3.5 animate-pulse" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
            <span className="text-[11px] text-muted-foreground hidden lg:inline">
              • {formatRelativeTime(lastSaved.toISOString())}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNavigatorOpen(!navigatorOpen)}
              className="h-8 w-8 p-0"
              title={navigatorOpen ? "Hide scene navigator" : "Show scene navigator"}
            >
              {navigatorOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="gap-1.5 text-xs font-medium h-8"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </header>
      )}

      {/* Formatting Toolbar */}
      <ScreenplayToolbar
        editor={editor}
        onSetElementType={handleSetElementType}
        zenMode={zenMode}
        onToggleZenMode={() => setZenMode((prev) => !prev)}
      />

      {/* Main Workspace: Navigator + Virtual Page Canvas */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Scene Navigator (Collapses in Zen Mode) */}
        {navigatorOpen && !zenMode && (
          <SceneNavigator
            scenes={dynamicScenes}
            activeSceneId={activeSceneId}
            onSelectScene={handleSelectScene}
          />
        )}

        {/* Center Page Canvas Area */}
        <main className="flex-1 overflow-y-auto flex justify-center py-8 px-4 sm:px-6 md:px-8 bg-muted/40 transition-all">
          <div
            className="w-full max-w-[850px] bg-background shadow-lg border border-border/80 rounded-sm min-h-[1056px] relative p-12 sm:p-16 mb-16"
            style={{
              minHeight: `${calculatedMinHeight}px`,
            }}
          >
            <EditorContent editor={editor} />
            <ScreenplayAutocompletePopover editor={editor} />
          </div>
        </main>
      </div>

      {/* Bottom Screenplay Telemetry Status Bar */}
      <footer className="h-7 border-t border-border bg-background/95 backdrop-blur px-3 flex items-center justify-between text-[11px] text-muted-foreground z-20 select-none">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">
            Page {stats.pageCount || 1}
          </span>
          <span>•</span>
          <span>{currentWordCount} words</span>
          <span>•</span>
          <span>{dynamicScenes.length} scenes</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="capitalize font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-[10px] text-foreground">
            {activeElementType.replace("-", " ")}
          </span>
          {isUnlocked && screenplayKey && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px]">
              <span>🔒</span> E2EE Protected
            </span>
          )}
        </div>
      </footer>

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        project={project}
      />

      {/* E2EE Setup / Unlock Modal */}
      <EncryptionDialog
        open={encryptionDialogOpen}
        onOpenChange={setEncryptionDialogOpen}
        mode={useEncryptionStore.getState().userMetadata ? "unlock" : "setup"}
        onSuccess={async () => {
          const targetId = activeScreenplayId || project.id;
          let key =
            useEncryptionStore.getState().screenplayKeys[targetId] ||
            useEncryptionStore.getState().screenplayKeys[project.id];
          if (!key) {
            try {
              key = await useEncryptionStore.getState().loadAndUnlockScreenplayKey(targetId, project.id);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message.toLowerCase() : "";
              const statusCode =
                (err as { statusCode?: number })?.statusCode || (err as { status?: number })?.status;
              const code = (err as { code?: string })?.code;
              if (
                statusCode === 404 ||
                code === "NOT_FOUND" ||
                code === "ENTITY_NOT_FOUND" ||
                msg.includes("404") ||
                msg.includes("not found") ||
                msg.includes("screenplay key not found")
              ) {
                const res = await useEncryptionStore.getState().createAndWrapScreenplayKey(targetId);
                key = res.sck;
              } else {
                throw err;
              }
            }
          }

          if (key && editor) {
            const rawContent = screenplay?.content || project.screenplayContent;
            const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
            const parsed = parseEncryptedPayloadString(contentStr);
            if (parsed) {
              const decryptedDoc = await decryptScreenplayContent(parsed, key);
              const normalized = normalizeScreenplayDoc(decryptedDoc);
              editor.commands.setContent(normalized);
              editor.setEditable(true);
            } else {
              const json = editor.getJSON() as TipTapDocumentJSON;
              const res = await screenplaysApi.saveEncryptedContent(targetId, json, key, currentRevision);
              if (res && res.revision) {
                setCurrentRevision(res.revision);
              }
            }
          }
        }}
      />
    </div>
  );
}
