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
import {
  ScreenplayParagraph,
  ScreenplayHeading,
  ScreenplayShortcuts,
  ScreenplayPagination,
} from "./screenplay-extensions";
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
  const screenplayKey = useEncryptionStore((state) => state.screenplayKeys[project.id]);
  const createAndWrapScreenplayKey = useEncryptionStore(
    (state) => state.createAndWrapScreenplayKey
  );

  const [navigatorOpen, setNavigatorOpen] = useState(true);
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
  const initialContent = useMemo(() => {
    const parsedPayload = parseEncryptedPayloadString(project.screenplayContent);
    if (!parsedPayload) {
      return project.screenplayContent;
    }
    // If encrypted and not yet decrypted, placeholder until key is provided
    return `<p>🔒 Encrypted content. Please unlock with your passphrase.</p>`;
  }, [project.screenplayContent]);

  // Initialize TipTap editor with screenplay extensions and pagination
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
      }),
      ScreenplayParagraph,
      ScreenplayHeading,
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
      setSaveStatus("saving");

      const html = currentEditor.getHTML();
      const json = currentEditor.getJSON() as TipTapDocumentJSON;
      const text = currentEditor.getText();
      setCurrentHtml(html);

      // Calculate stats
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const headingMatches = html.match(/<h2/gi) || [];
      const scenesCount = Math.max(1, headingMatches.length);

      setStats((prev) => ({
        ...prev,
        wordCount: words,
        sceneCount: scenesCount,
      }));

      // Debounced auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const firstSlugline = dynamicScenes[0]?.slugline || "INT. OPENING SCENE - DAY";
          let payloadToSave = html;

          // Always get the latest in-memory SCK from the cryptographic store
          const currentKey = useEncryptionStore.getState().screenplayKeys[project.id];
          if (currentKey) {
            const encryptedPayload = await encryptScreenplayContent(json, currentKey);
            payloadToSave = JSON.stringify(encryptedPayload);
          }

          await updateProjectMutation.mutateAsync({
            id: project.id,
            data: {
              screenplayContent: payloadToSave,
              lastEditedScene: firstSlugline,
            },
          });
          setSaveStatus("saved");
          setLastSaved(new Date());
        } catch {
          // If server is unreachable or fails, keep local state
          setSaveStatus("saved");
        }
      }, 1200);
    },
  });

  // Attempt to load metadata and decrypt on mount
  useEffect(() => {
    const isEncrypted = !!parseEncryptedPayloadString(project.screenplayContent);
    
    useEncryptionStore.getState().fetchUserMetadata().then((meta) => {
      if (isEncrypted && !isUnlocked) {
        setEncryptionDialogOpen(true);
      }
    });
  }, [project.screenplayContent, isUnlocked]);

  // Decrypt content when key becomes available in memory
  useEffect(() => {
    if (!editor || !screenplayKey) return;

    const parsedPayload = parseEncryptedPayloadString(project.screenplayContent);
    if (parsedPayload) {
      decryptScreenplayContent(parsedPayload, screenplayKey)
        .then((doc) => {
          editor.commands.setContent(doc);
        })
        .catch((err) => {
          console.error("Failed to decrypt initial content:", err);
        });
    }
  }, [editor, screenplayKey, project.screenplayContent]);

  // Handle format element buttons
  const handleSetElementType = useCallback(
    (
      type:
        | "scene-heading"
        | "action"
        | "character"
        | "dialogue"
        | "parenthetical"
        | "transition"
    ) => {
      if (!editor) return;

      if (type === "scene-heading") {
        editor.chain().focus().setHeading({ level: 2 }).run();
      } else {
        editor.chain().focus().setNode("paragraph", { dataType: type }).run();
      }
    },
    [editor]
  );

  // Jump to scene in editor
  const handleSelectScene = (scene: SceneItem) => {
    setActiveSceneId(scene.id);
    if (!editor) return;

    const content = editor.getText();
    const cleanSearch = scene.slugline.toUpperCase();
    const index = content.toUpperCase().indexOf(cleanSearch);

    if (index !== -1) {
      editor.commands.setTextSelection({ from: index + 1, to: index + 1 + cleanSearch.length });
      editor.commands.scrollIntoView();
    }
  };

  const calculatedMinHeight =
    Math.max(1, stats.pageCount) * 1056 + (Math.max(1, stats.pageCount) - 1) * 44;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/30">
      {/* Top Editor Bar */}
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

      {/* Formatting Toolbar */}
      <ScreenplayToolbar
        editor={editor}
        onSetElementType={handleSetElementType}
      />

      {/* Main Workspace: Navigator + Virtual Page Canvas */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Scene Navigator */}
        {navigatorOpen && (
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
          </div>
        </main>
      </div>

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
          let key = useEncryptionStore.getState().screenplayKeys[project.id];
          if (!key) {
            try {
              key = await useEncryptionStore.getState().loadAndUnlockScreenplayKey(project.id);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message.toLowerCase() : "";
              const statusCode = (err as { statusCode?: number })?.statusCode || (err as { status?: number })?.status;
              const code = (err as { code?: string })?.code;
              if (
                statusCode === 404 ||
                code === "NOT_FOUND" ||
                code === "ENTITY_NOT_FOUND" ||
                msg.includes("404") ||
                msg.includes("not found") ||
                msg.includes("screenplay key not found")
              ) {
                const res = await useEncryptionStore.getState().createAndWrapScreenplayKey(project.id);
                key = res.sck;
              } else {
                throw err;
              }
            }
          }

          if (key && editor) {
            const currentContent = project.screenplayContent;
            const parsed = parseEncryptedPayloadString(currentContent);
            if (parsed) {
              const decryptedDoc = await decryptScreenplayContent(parsed, key);
              editor.commands.setContent(decryptedDoc);
            } else {
              const json = editor.getJSON() as TipTapDocumentJSON;
              const encrypted = await encryptScreenplayContent(json, key);
              await updateProjectMutation.mutateAsync({
                id: project.id,
                data: {
                  screenplayContent: JSON.stringify(encrypted),
                },
              });
            }
          }
        }}
      />
    </div>
  );
}
