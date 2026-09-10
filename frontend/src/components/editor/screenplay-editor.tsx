"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  CheckCircle2,
  CloudUpload,
  Download,
  History,
  Share2,
  PanelLeftClose,
  PanelLeft,
  Lock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useHotkeys, type RegisterableHotkey } from "@tanstack/react-hotkeys";
import type { Project, ScreenplayElementType, SceneItem } from "@/types/screenplay";
import { screenplaysApi, type ScreenplayDetailResponse } from "@/lib/api/screenplays";
import { useEncryptionStore } from "@/stores/encryption-store";
import {
  parseEncryptedPayloadString,
  decryptScreenplayContent,
  isEmptyEncryptedPayload,
  type TipTapDocumentJSON,
} from "@/lib/crypto";
import { EncryptionBadge } from "@/components/crypto/encryption-badge";
import { EncryptionDialog } from "@/components/crypto/encryption-dialog";
import { EncryptionOnboardingModal } from "@/components/crypto/encryption-onboarding-modal";
import { ShareScreenplayModal } from "@/components/crypto/share-screenplay-modal";
import { useShortcutsStore } from "@/stores/screenplay-shortcuts-store";
import {
  extractScenesFromDoc,
  sceneBlocksToSceneItems,
} from "@/lib/screenplay/screenplay-context";

import { ScreenplayToolbar } from "./screenplay-toolbar";
import { SceneNavigator } from "./scene-navigator";
import { ExportModal } from "./export-modal";
import { VersionHistoryModal } from "./version-history-modal";
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
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/date";
import { toast } from "sonner";

interface ScreenplayEditorProps {
  project: Project;
}

// ─── Scene Extraction (AST-based) ─────────────────────────────────────────────
// The extractScenesFromDoc + sceneBlocksToSceneItems utilities in
// screenplay-context.ts provide reliable, HTML-free scene extraction.

export function ScreenplayEditor({ project }: ScreenplayEditorProps) {
  const status = useEncryptionStore((state) => state.status);
  const isInitializing = useEncryptionStore((state) => state.isInitializing);
  const activeUEK = useEncryptionStore((state) => state.activeUEK);
  const userMetadata = useEncryptionStore((state) => state.userMetadata);

  const [screenplay, setScreenplay] = useState<ScreenplayDetailResponse | null>(null);
  const [activeScreenplayId, setActiveScreenplayId] = useState<string>("");
  const [currentRevision, setCurrentRevision] = useState<number>(1);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isRekeying, setIsRekeying] = useState(false);

  const screenplayKey = useEncryptionStore(
    (state) => (activeScreenplayId ? state.screenplayKeys[activeScreenplayId] : undefined)
  );

  const isReadyToEdit = status === "UNLOCKED" && !!activeUEK && !!screenplayKey && isDecrypted;

  const [navigatorOpen, setNavigatorOpen] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [lastSaved, setLastSaved] = useState<Date>(new Date(project.updatedAt));
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);

  const [currentHtml, setCurrentHtml] = useState<string>("");
  const [activeSceneId, setActiveSceneId] = useState<string | undefined>(project.scenes?.[0]?.id);

  const [stats, setStats] = useState({ pageCount: 1, wordCount: 0, sceneCount: 1 });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks whether the document has unsaved changes (docChanged from ProseMirror)
  const isDirtyRef = useRef(false);

  // Shortcut registry — single source of truth for element-selection shortcuts
  const { definitions, getEffectiveHotkey } = useShortcutsStore();

  const initialContent = useMemo(() => {
    return `<p data-type="action"></p>`;
  }, []);

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
        setStats({
          pageCount: sp.pageCount || 1,
          wordCount: sp.wordCount || 0,
          sceneCount: sp.sceneCount || 1,
        });
      })
      .catch((err) => {
        console.debug("Default screenplay lookup:", err);
      });
    return () => {
      mounted = false;
    };
  }, [project.id]);

  // Initialize TipTap editor with semantic screenplay nodes and pagination
  // Strictly non-editable until encryption readiness is established
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
        listItem: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
      }),
      ...ScreenplayNodes,
      ScreenplayAutoFormatting,
      ScreenplaySmartDetection,
      ScreenplayPasteHandler,
      ScreenplayShortcuts,
      ScreenplayPagination.configure({
        projectTitle: project.title,
        // Usable height: 1056px page - 96px top margin - 96px bottom margin = 864px
        pageUsableHeight: 864,
        onPageCountChange: (pageCount: number) => {
          setStats((prev) => ({ ...prev, pageCount }));
        },
      }),
      Placeholder.configure({
        placeholder: "Write scene heading (e.g. INT. TRAIN COMPARTMENT - NIGHT)...",
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        // No width/max-width here — layout is controlled by .screenplay-page padding
        class: "focus:outline-none font-screenplay",
      },
    },
    onTransaction: ({ transaction }) => {
      // ─── SAVE BUG FIX ───────────────────────────────────────────────────────
      // TipTap fires onTransaction for EVERY ProseMirror transaction, including
      // pure selection changes (cursor moves, hover states, toolbar interactions).
      // Only mark dirty and schedule save when the DOCUMENT actually changed.
      // This prevents:
      //   - toolbar tab clicks from triggering save
      //   - cursor moves from triggering save
      //   - clicking same element type twice from triggering save
      // ────────────────────────────────────────────────────────────────────────
      if (!transaction.docChanged) return;
      if (!isReadyToEdit || !screenplayKey) return;

      // Mark the document as dirty — actual save happens in the debounced timeout
      isDirtyRef.current = true;

      // We need the live editor ref for HTML/JSON, so use a closure via the editor object
      // (editor is captured in closure; safe because we check isReadyToEdit above)
      setSaveStatus("saving");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!isDirtyRef.current) return; // another guard in case state changed
        isDirtyRef.current = false;

        try {
          const targetId = screenplay?.id || activeScreenplayId;
          let nextRevision = currentRevision;

          if (!targetId || !isReadyToEdit || !screenplayKey) {
            console.warn("Autosave skipped: screenplay encryption key or unlocked session not ready.");
            return;
          }

          // Use editor.getJSON() — editor is stable ref in useEditor closure
          const json = editor?.getJSON() as TipTapDocumentJSON;
          const text = editor?.getText() ?? "";
          const words = text.trim() ? text.trim().split(/\s+/).length : 0;

          let sceneCount = 0;
          editor?.state.doc.descendants((node) => {
            if (node.type.name === "sceneHeading") sceneCount++;
          });

          setCurrentHtml(editor?.getHTML() ?? "");
          setStats((prev) => ({ ...prev, wordCount: words, sceneCount: sceneCount || 1 }));

          const res = await screenplaysApi.saveEncryptedContent(
            targetId,
            json,
            screenplayKey,
            currentRevision,
            {
              wordCount: words,
              pageCount: stats.pageCount,
              sceneCount: sceneCount || 1,
            }
          );
          if (res && res.revision) {
            nextRevision = res.revision;
          }

          setCurrentRevision(nextRevision);
          setSaveStatus("saved");
          setLastSaved(new Date());
        } catch (err) {
          console.error("Autosave failed:", err);
          setSaveStatus("saved");
        }
      }, 1000);
    },
  });

  // Synchronize editor editable state strictly with isReadyToEdit
  useEffect(() => {
    if (editor) {
      editor.setEditable(isReadyToEdit);
    }
  }, [editor, isReadyToEdit]);

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

  // Dynamic scenes derived from document AST (not HTML)
  const dynamicScenes = useMemo(() => {
    if (!editor) return project.scenes ?? [];
    const blocks = extractScenesFromDoc(editor.state.doc);
    const items = sceneBlocksToSceneItems(blocks);
    return items.length > 0
      ? items
      : (project.scenes ?? [
          {
            id: "sc-1",
            number: 1,
            slugline: "INT. OPENING SCENE - DAY",
            location: "OPENING SCENE",
            time: "DAY" as const,
            pageNumber: 1,
          },
        ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHtml, editor, project.scenes]);

  // Attempt to load metadata and prompt on mount
  useEffect(() => {
    let mounted = true;
    useEncryptionStore
      .getState()
      .fetchUserMetadata()
      .then(() => {
        if (!mounted) return;
        const currentStatus = useEncryptionStore.getState().status;
        if (currentStatus === "NOT_CONFIGURED") {
          setOnboardingModalOpen(true);
        } else if (currentStatus === "LOCKED") {
          setUnlockDialogOpen(true);
        }
      })
      .catch((err) => {
        console.debug("User metadata lookup on mount:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // When unlocked, load or initialize the wrapped key for this screenplay if not already in memory.
  // CRITICAL: Only run once screenplay details have loaded so we never query keys using project.id.
  useEffect(() => {
    const targetId = screenplay?.id || activeScreenplayId;
    if (!targetId || status !== "UNLOCKED" || !activeUEK) {
      return;
    }

    if (useEncryptionStore.getState().screenplayKeys[targetId]) {
      return;
    }

    let mounted = true;
    useEncryptionStore
      .getState()
      .initializeScreenplayKey(targetId)
      .catch((err: unknown) => {
        if (!mounted) return;
        console.error("Failed to initialize screenplay key:", err);
        setDecryptionError(
          err instanceof Error ? err.message : "Failed to load encryption key for screenplay"
        );
      });

    return () => {
      mounted = false;
    };
  }, [status, activeUEK, screenplay?.id, activeScreenplayId]);

  // Decrypt content when key becomes available in memory
  useEffect(() => {
    const targetId = screenplay?.id || activeScreenplayId;
    if (!editor || !targetId || !screenplayKey || status !== "UNLOCKED" || !activeUEK) return;

    let mounted = true;

    const loadAndDecryptContent = async () => {
      // Yield to ensure no synchronous setState executes directly in the effect body
      await Promise.resolve();
      if (!mounted) return;

      const rawContent = screenplay?.content;

      // Handle empty/new screenplay: never attempt to decrypt empty payload or render wrapper JSON
      if (isEmptyEncryptedPayload(rawContent)) {
        editor.commands.setContent("<p data-type=\"action\"></p>", { emitUpdate: false });
        if (!mounted) return;
        setCurrentHtml(editor.getHTML());
        setIsDecrypted(true);
        setIsDecrypting(false);
        setDecryptionError(null);
        return;
      }

      const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const parsed = parseEncryptedPayloadString(contentStr);

      if (parsed) {
        setIsDecrypting(true);
        setDecryptionError(null);
        try {
          const doc = await decryptScreenplayContent(parsed, screenplayKey);
          if (!mounted) return;
          const normalized = normalizeScreenplayDoc(doc);
          editor.commands.setContent(normalized, { emitUpdate: false });
          setCurrentHtml(editor.getHTML());
          setIsDecrypted(true);
        } catch (err) {
          if (!mounted) return;
          console.error("Failed to decrypt initial content:", err);
          setDecryptionError(
            `AES-GCM decryption failed (content may be corrupted or encryption key is incorrect): ${
              err instanceof Error ? err.message : "Authentication tag verification failed"
            }`
          );
        } finally {
          if (mounted) {
            setIsDecrypting(false);
          }
        }
      } else {
        // Guard against any encrypted wrapper JSON string accidentally slipping into editor as plaintext
        if (
          contentStr.trim() &&
          contentStr !== "<p></p>" &&
          !contentStr.includes('"algorithm"') &&
          !contentStr.includes('"ciphertext"') &&
          !contentStr.includes('"CIPHERTEXT"')
        ) {
          editor.commands.setContent(contentStr, { emitUpdate: false });
        } else {
          editor.commands.setContent("<p data-type=\"action\"></p>", { emitUpdate: false });
        }
        if (!mounted) return;
        setCurrentHtml(editor.getHTML());
        setIsDecrypted(true);
        setIsDecrypting(false);
      }
    };

    loadAndDecryptContent();

    return () => {
      mounted = false;
    };
  }, [editor, screenplayKey, screenplay?.id, screenplay?.content, activeScreenplayId, status, activeUEK]);

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
        extension: "extension",
        transition: "transition",
        subheader: "subheader",
        shot: "shot",
      };

      const targetNode = nodeMap[type] || "action";
      editor.chain().focus().setNode(targetNode).run();
    },
    [editor]
  );

  // Register element-type selection shortcuts via TanStack Hotkeys.
  // These are driven by the shortcut registry so they update when the user
  // customizes them in Settings → Shortcuts. Only active when editor is ready.
  useHotkeys(
    definitions.map((def) => ({
      hotkey: getEffectiveHotkey(def.id) as RegisterableHotkey,
      callback: (e: KeyboardEvent) => {
        e.preventDefault();
        handleSetElementType(def.id as ScreenplayElementType);
      },
      options: { enabled: isReadyToEdit },
    })),
    { preventDefault: true }
  );

  // Jump to scene in editor via accurate ProseMirror document AST search
  const handleSelectScene = (scene: SceneItem) => {
    setActiveSceneId(scene.id);
    if (!editor) return;

    const targetSlugline = scene.slugline.trim().toUpperCase();
    let targetPos: number | null = null;

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
          return false;
        }
      }
    });

    if (targetPos !== null) {
      editor
        .chain()
        .focus()
        .setTextSelection(targetPos)
        .scrollIntoView()
        .run();
    }
  };

  // Page height (1056px) × pageCount + gap between pages (44px) × (pageCount - 1)
  const calculatedMinHeight =
    Math.max(1, stats.pageCount) * 1056 + (Math.max(1, stats.pageCount) - 1) * 44;

  const handleCryptoReady = useCallback(async () => {
    const targetId = screenplay?.id || activeScreenplayId;
    if (!targetId) return;

    setDecryptionError(null);
    try {
      const key = await useEncryptionStore.getState().initializeScreenplayKey(targetId);
      if (key && editor) {
        const rawContent = screenplay?.content;
        if (isEmptyEncryptedPayload(rawContent)) {
          editor.commands.setContent("<p data-type=\"action\"></p>", { emitUpdate: false });
          setCurrentHtml(editor.getHTML());
          setIsDecrypted(true);
          setIsDecrypting(false);
          return;
        }

        const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        const parsed = parseEncryptedPayloadString(contentStr);
        if (parsed) {
          setIsDecrypting(true);
          const decryptedDoc = await decryptScreenplayContent(parsed, key);
          const normalized = normalizeScreenplayDoc(decryptedDoc);
          editor.commands.setContent(normalized, { emitUpdate: false });
          setCurrentHtml(editor.getHTML());
          setIsDecrypted(true);
          setIsDecrypting(false);
        } else {
          if (
            contentStr.trim() &&
            contentStr !== "<p></p>" &&
            !contentStr.includes('"algorithm"') &&
            !contentStr.includes('"ciphertext"') &&
            !contentStr.includes('"CIPHERTEXT"')
          ) {
            editor.commands.setContent(contentStr, { emitUpdate: false });
            setCurrentHtml(editor.getHTML());
          } else {
            editor.commands.setContent("<p data-type=\"action\"></p>", { emitUpdate: false });
            setCurrentHtml(editor.getHTML());
          }
          setIsDecrypted(true);
          setIsDecrypting(false);
        }
      }
    } catch (err) {
      console.error("handleCryptoReady failed:", err);
      setDecryptionError(err instanceof Error ? err.message : "Failed to initialize screenplay key");
      setIsDecrypting(false);
    }
  }, [screenplay, activeScreenplayId, editor]);

  const handleRekeyScreenplay = useCallback(async () => {
    const targetId = screenplay?.id || activeScreenplayId;
    if (!targetId || !editor || !activeUEK || status !== "UNLOCKED") {
      toast.error("Please unlock your encryption session first.");
      setUnlockDialogOpen(true);
      return;
    }

    try {
      setIsRekeying(true);
      setDecryptionError(null);

      // 1. Generate new SCK and wrap/upsert to backend
      const { sck } = await useEncryptionStore.getState().createAndWrapScreenplayKey(targetId);

      // 2. Prepare content: standard initial screenplay template
      const initialDoc: TipTapDocumentJSON = {
        type: "doc",
        content: [
          {
            type: "sceneHeading",
            attrs: { sceneNumber: 1 },
            content: [{ type: "text", text: "1. INT. OPENING SCENE - DAY" }],
          },
          {
            type: "action",
            content: [{ type: "text", text: "Write your screenplay here..." }],
          },
        ],
      };

      // 3. Encrypt and save to backend
      const nextRev = (currentRevision || 0) + 1;
      await screenplaysApi.saveEncryptedContent(targetId, initialDoc, sck, nextRev, {
        wordCount: 7,
        pageCount: 1,
        sceneCount: 1,
      });

      // 4. Update editor and state
      setCurrentRevision(nextRev);
      editor.commands.setContent(initialDoc);
      setCurrentHtml(editor.getHTML());
      setIsDecrypted(true);
      setIsDecrypting(false);
      toast.success("Screenplay encryption key re-initialized and synchronized!");
    } catch (err) {
      console.error("Failed to re-key screenplay:", err);
      const msg = err instanceof Error ? err.message : "Failed to re-key screenplay";
      setDecryptionError(msg);
      toast.error(msg);
    } finally {
      setIsRekeying(false);
    }
  }, [screenplay, activeScreenplayId, editor, activeUEK, status, currentRevision]);

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
                onClick={() => {
                  if (status === "NOT_CONFIGURED") {
                    setOnboardingModalOpen(true);
                  } else {
                    setUnlockDialogOpen(true);
                  }
                }}
                className="cursor-pointer"
              >
                <EncryptionBadge screenplayId={activeScreenplayId || screenplay?.id || ""} />
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
              • {formatRelativeTime(lastSaved)}
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
              onClick={() => setHistoryModalOpen(true)}
              className="gap-1.5 text-xs font-medium h-8"
              title="Version History & Checkpoints"
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareModalOpen(true)}
              className="gap-1.5 text-xs font-medium h-8"
              title="Share Screenplay & Collaborators"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
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
      <div className={!isReadyToEdit ? "pointer-events-none opacity-50 select-none transition-opacity" : "transition-opacity"}>
        <ScreenplayToolbar
          editor={editor}
          onSetElementType={handleSetElementType}
          zenMode={zenMode}
          onToggleZenMode={() => setZenMode((prev) => !prev)}
        />
      </div>

      {/* Main Workspace: Navigator + Physical Page Canvas */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Scene Navigator (Collapses in Zen Mode) */}
        {navigatorOpen && !zenMode && (
          <SceneNavigator
            scenes={dynamicScenes}
            activeSceneId={activeSceneId}
            onSelectScene={handleSelectScene}
          />
        )}

        {/* Center Page Canvas Area — workspace is the scrollable muted background;
            screenplay-page is the fixed 8.5×11 white document (816px × 1056px+) */}
        <main className="screenplay-workspace flex-1 overflow-y-auto flex justify-center py-10 px-6 transition-all relative">
          <div
            className="screenplay-page screenplay-paper shadow-lg"
            style={{
              minHeight: `${calculatedMinHeight}px`,
              marginBottom: "40px",
            }}
          >
            <EditorContent editor={editor} className="screenplay-editor" />
            <ScreenplayAutocompletePopover editor={editor} />

            {/* Strict Encryption Blocker Overlay */}
            {!isReadyToEdit && (
              <div
                id="encryption-editor-blocker-overlay"
                className="absolute inset-0 bg-background/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 sm:p-10 select-none animate-in fade-in duration-200"
              >
                <div className="max-w-md w-full bg-card border border-border shadow-xl rounded-xl p-6 sm:p-8 text-center flex flex-col items-center gap-4">
                  {isInitializing ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Loader2 className="w-7 h-7 animate-spin text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-base text-foreground">
                          Initializing Encryption
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Verifying cryptographic session and keys...
                        </p>
                      </div>
                    </>
                  ) : status === "NOT_CONFIGURED" ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <KeyRound className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-semibold text-base text-foreground">
                          Zero-Knowledge Encryption Required
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          This screenplay is protected with client-side end-to-end encryption.
                          Set up your encryption passphrase to activate zero-knowledge protection and begin writing.
                        </p>
                      </div>
                      <Button
                        id="setup-encryption-editor-btn"
                        onClick={() => setOnboardingModalOpen(true)}
                        className="gap-2 w-full mt-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Set Up Encryption
                      </Button>
                    </>
                  ) : status === "UNLOCK_FAILED" ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <ShieldAlert className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-semibold text-base text-foreground">
                          Incorrect Encryption Password
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          The encryption password entered could not decrypt your private key.
                          Please enter your correct password to unlock this screenplay.
                        </p>
                        <div className="bg-destructive/10 text-destructive text-xs py-2 px-3 rounded-md font-medium">
                          Incorrect encryption password.
                        </div>
                      </div>
                      <Button
                        id="retry-unlock-editor-btn"
                        onClick={() => setUnlockDialogOpen(true)}
                        variant="default"
                        className="gap-2 w-full mt-2"
                      >
                        <Lock className="w-4 h-4" />
                        Try Again
                      </Button>
                    </>
                  ) : status === "LOCKED" ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Lock className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-semibold text-base text-foreground">
                          Screenplay Is Encrypted & Locked
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Your screenplay content is encrypted with AES-256-GCM.
                          Enter your encryption passphrase to decrypt the content and begin editing.
                        </p>
                      </div>
                      <Button
                        id="unlock-screenplay-editor-btn"
                        onClick={() => setUnlockDialogOpen(true)}
                        className="gap-2 w-full mt-2"
                      >
                        <Lock className="w-4 h-4" />
                        Unlock Screenplay
                      </Button>
                    </>
                  ) : decryptionError ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <ShieldAlert className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-semibold text-base text-foreground">
                          Decryption Failed
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {decryptionError}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                        <Button
                          id="retry-unlock-decryption-btn"
                          onClick={() => setUnlockDialogOpen(true)}
                          variant="outline"
                          className="gap-2 flex-1"
                        >
                          <Lock className="w-4 h-4" />
                          Re-enter Passphrase
                        </Button>
                        <Button
                          id="rekey-screenplay-btn"
                          onClick={handleRekeyScreenplay}
                          disabled={isRekeying}
                          variant="default"
                          className="gap-2 flex-1"
                        >
                          {isRekeying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <KeyRound className="w-4 h-4" />
                          )}
                          Re-key Screenplay
                        </Button>
                      </div>
                    </>
                  ) : isDecrypting ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Loader2 className="w-7 h-7 animate-spin text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-base text-foreground">
                          Decrypting Screenplay Content
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Decrypting scenes and dialogue with verified screenplay key...
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Loader2 className="w-7 h-7 animate-spin text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-base text-foreground">
                          Unwrapping Screenplay Key
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Decrypting screenplay session key with your master key...
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
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
          {isReadyToEdit ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px]">
              <span>🔒</span> E2EE Protected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px]">
              <span>🔓</span> E2EE Locked
            </span>
          )}
        </div>
      </footer>

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        project={project}
        stats={stats}
        contentHtml={editor?.getHTML() || ""}
      />

      {/* Version History & Checkpoints Modal */}
      <VersionHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        screenplayId={activeScreenplayId || screenplay?.id || ""}
        projectId={project.id}
        editor={editor}
        onVersionRestored={(newRev) => {
          setCurrentRevision(newRev);
          setLastSaved(new Date());
        }}
      />

      {/* Share Screenplay & Collaborators Modal */}
      <ShareScreenplayModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        screenplayId={activeScreenplayId || screenplay?.id || ""}
        screenplayTitle={screenplay?.title || project.title}
      />

      {/* E2EE Setup Modal */}
      <EncryptionOnboardingModal
        open={onboardingModalOpen}
        onOpenChange={setOnboardingModalOpen}
        onSuccess={handleCryptoReady}
      />

      {/* E2EE Unlock Modal */}
      <EncryptionDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        mode={userMetadata ? "unlock" : "setup"}
        onSuccess={handleCryptoReady}
      />
    </div>
  );
}
