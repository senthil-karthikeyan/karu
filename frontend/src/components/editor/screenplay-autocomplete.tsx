"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { User, MapPin, Clock, ArrowRight, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutocompleteItem {
  id: string;
  label: string;
  sublabel?: string;
  type: "character" | "location" | "prefix" | "time" | "transition" | "shot";
  insertText: string;
  splitAfter?: boolean;
}

interface ScreenplayAutocompleteProps {
  editor: Editor | null;
}

const PREFIX_SUGGESTIONS: AutocompleteItem[] = [
  { id: "p-int", label: "INT.", sublabel: "Interior scene", type: "prefix", insertText: "INT. " },
  { id: "p-ext", label: "EXT.", sublabel: "Exterior scene", type: "prefix", insertText: "EXT. " },
  { id: "p-intext", label: "INT/EXT.", sublabel: "Interior & Exterior", type: "prefix", insertText: "INT/EXT. " },
  { id: "p-ie", label: "I/E.", sublabel: "Interior/Exterior shorthand", type: "prefix", insertText: "I/E. " },
];

const TIME_SUGGESTIONS: AutocompleteItem[] = [
  { id: "t-day", label: "DAY", sublabel: "Time of day", type: "time", insertText: "DAY" },
  { id: "t-night", label: "NIGHT", sublabel: "Time of day", type: "time", insertText: "NIGHT" },
  { id: "t-dusk", label: "DUSK", sublabel: "Time of day", type: "time", insertText: "DUSK" },
  { id: "t-dawn", label: "DAWN", sublabel: "Time of day", type: "time", insertText: "DAWN" },
  { id: "t-cont", label: "CONTINUOUS", sublabel: "Seamless continuation", type: "time", insertText: "CONTINUOUS" },
  { id: "t-later", label: "LATER", sublabel: "Time shift", type: "time", insertText: "LATER" },
  { id: "t-moments", label: "MOMENTS LATER", sublabel: "Short time shift", type: "time", insertText: "MOMENTS LATER" },
  { id: "t-same", label: "SAME TIME", sublabel: "Concurrent action", type: "time", insertText: "SAME TIME" },
];

const TRANSITION_SUGGESTIONS: AutocompleteItem[] = [
  { id: "tr-cut", label: "CUT TO:", sublabel: "Standard scene transition", type: "transition", insertText: "CUT TO:", splitAfter: true },
  { id: "tr-fadein", label: "FADE IN:", sublabel: "Script opening", type: "transition", insertText: "FADE IN:", splitAfter: true },
  { id: "tr-fadeout", label: "FADE OUT.", sublabel: "Script closing / blackout", type: "transition", insertText: "FADE OUT.", splitAfter: true },
  { id: "tr-smash", label: "SMASH CUT TO:", sublabel: "Abrupt hard transition", type: "transition", insertText: "SMASH CUT TO:", splitAfter: true },
  { id: "tr-dissolve", label: "DISSOLVE TO:", sublabel: "Gradual blend transition", type: "transition", insertText: "DISSOLVE TO:", splitAfter: true },
  { id: "tr-match", label: "MATCH CUT TO:", sublabel: "Visual/auditory matched cut", type: "transition", insertText: "MATCH CUT TO:", splitAfter: true },
  { id: "tr-jump", label: "JUMP CUT TO:", sublabel: "Elliptical jump cut", type: "transition", insertText: "JUMP CUT TO:", splitAfter: true },
  { id: "tr-back", label: "BACK TO SCENE:", sublabel: "Return from flashback/insert", type: "transition", insertText: "BACK TO SCENE:", splitAfter: true },
  { id: "tr-intercut", label: "INTERCUT:", sublabel: "Parallel cutting", type: "transition", insertText: "INTERCUT:", splitAfter: true },
];

const SHOT_SUGGESTIONS: AutocompleteItem[] = [
  { id: "sh-close", label: "CLOSE ON", sublabel: "Close-up detail", type: "shot", insertText: "CLOSE ON " },
  { id: "sh-angle", label: "ANGLE ON", sublabel: "Specific perspective", type: "shot", insertText: "ANGLE ON " },
  { id: "sh-wide", label: "WIDE SHOT", sublabel: "Broad establishing frame", type: "shot", insertText: "WIDE SHOT " },
  { id: "sh-pov", label: "POV", sublabel: "Point of view shot", type: "shot", insertText: "POV " },
  { id: "sh-insert", label: "INSERT - ", sublabel: "Cutaway object insert", type: "shot", insertText: "INSERT - " },
  { id: "sh-est", label: "ESTABLISHING - ", sublabel: "Location establishing shot", type: "shot", insertText: "ESTABLISHING - " },
];

function getDocCharactersAndLocations(editor: Editor): { docCharacters: string[]; docLocations: string[] } {
  const chars = new Set<string>();
  const locs = new Set<string>();

  editor.state.doc.descendants((node) => {
    const text = (node.textContent || "").trim().toUpperCase();
    if (node.type.name === "character" && text) {
      const cleanChar = text.replace(/\s*\([^)]*\)/g, "").trim();
      if (cleanChar.length > 0 && cleanChar.length <= 35) {
        chars.add(cleanChar);
      }
    } else if (node.type.name === "sceneHeading" && text) {
      const withoutPrefix = text.replace(/^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, "").trim();
      const locationPart = withoutPrefix.split("-")[0]?.trim();
      if (locationPart && locationPart.length > 1) {
        locs.add(locationPart);
      }
    }
  });

  return {
    docCharacters: Array.from(chars),
    docLocations: Array.from(locs),
  };
}

function computeSuggestions(editor: Editor): AutocompleteItem[] {
  if (!editor || !editor.isEditable) return [];

  const { selection } = editor.state;
  if (!selection.empty) return [];

  const { $anchor } = selection;
  const node = $anchor.parent;
  const nodeType = node.type.name;
  const text = node.textContent;
  const textUpper = text.toUpperCase();

  const { docCharacters, docLocations } = getDocCharactersAndLocations(editor);

  // 1. Character suggestions
  if (nodeType === "character") {
    const query = textUpper.trim();
    const matches: AutocompleteItem[] = [];

    for (const char of docCharacters) {
      if (!query || char.includes(query) || query.includes(char)) {
        matches.push({
          id: `char-${char}`,
          label: char,
          sublabel: "Character",
          type: "character",
          insertText: char,
          splitAfter: true,
        });
      }
    }

    if (query.length > 0) {
      const extensions = ["(V.O.)", "(O.S.)", "(CONT'D)", "(FILTERED)"];
      for (const ext of extensions) {
        const combined = `${query} ${ext}`.trim();
        matches.push({
          id: `ext-${combined}`,
          label: combined,
          sublabel: `Extension ${ext}`,
          type: "character",
          insertText: combined,
          splitAfter: true,
        });
      }
    }

    return matches.slice(0, 6);
  }

  // 2. Scene Heading suggestions
  if (nodeType === "sceneHeading") {
    const trimmed = textUpper.trim();

    if (!trimmed || trimmed.length < 4) {
      return PREFIX_SUGGESTIONS.filter((p) => !trimmed || p.label.startsWith(trimmed));
    }

    if (textUpper.includes(" - ") || textUpper.endsWith("-")) {
      const afterDash = textUpper.split("-").pop()?.trim() || "";
      return TIME_SUGGESTIONS.filter((t) => !afterDash || t.label.includes(afterDash));
    }

    const prefixMatch = textUpper.match(/^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*(.*)$/);
    if (prefixMatch) {
      const locQuery = prefixMatch[1].trim();
      const matches: AutocompleteItem[] = [];
      const currentPrefix = textUpper.split(" ")[0] + " ";

      for (const loc of docLocations) {
        if (!locQuery || loc.includes(locQuery)) {
          matches.push({
            id: `loc-${loc}`,
            label: `${currentPrefix}${loc} - DAY`,
            sublabel: `Location: ${loc}`,
            type: "location",
            insertText: `${currentPrefix}${loc} - DAY`,
          });
        }
      }

      return matches.slice(0, 6);
    }
  }

  // 3. Transition suggestions
  if (nodeType === "transition") {
    const query = textUpper.trim();
    return TRANSITION_SUGGESTIONS.filter((t) => !query || t.label.includes(query)).slice(0, 6);
  }

  // 4. Shot suggestions
  if (nodeType === "shot") {
    const query = textUpper.trim();
    return SHOT_SUGGESTIONS.filter((s) => !query || s.label.includes(query)).slice(0, 6);
  }

  return [];
}

export function ScreenplayAutocompletePopover({ editor }: ScreenplayAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const dismissedForSelectionRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Subscribe to editor selection and transaction updates
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (!editor.isEditable) {
        setIsOpen(false);
        return;
      }

      const items = computeSuggestions(editor);
      if (items.length === 0) {
        setIsOpen(false);
        return;
      }

      const { selection } = editor.state;
      if (dismissedForSelectionRef.current === selection.from) {
        setIsOpen(false);
        return;
      }

      try {
        const startCoord = editor.view.coordsAtPos(selection.from);
        if (startCoord) {
          setCoords({
            top: startCoord.bottom + 6,
            left: Math.max(16, Math.min(startCoord.left, window.innerWidth - 300)),
          });
          setSuggestions(items);
          setSelectedIndex(0);
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      } catch {
        setIsOpen(false);
      }
    };

    editor.on("selectionUpdate", handleUpdate);
    editor.on("update", handleUpdate);

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("update", handleUpdate);
    };
  }, [editor]);

  // Apply selected item to editor
  const applySuggestion = useCallback(
    (item: AutocompleteItem) => {
      if (!editor) return;

      const { selection } = editor.state;
      const { $anchor } = selection;
      const pos = $anchor.before($anchor.depth);
      const node = $anchor.parent;

      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          const from = pos + 1;
          const to = from + node.textContent.length;
          tr.replaceWith(from, to, editor.schema.text(item.insertText));
          return true;
        })
        .run();

      setIsOpen(false);
      dismissedForSelectionRef.current = editor.state.selection.from;

      if (item.splitAfter) {
        if (item.type === "character") {
          editor.chain().splitBlock().setNode("dialogue").run();
        } else if (item.type === "transition") {
          editor.chain().splitBlock().setNode("sceneHeading").run();
        }
      }
    },
    [editor]
  );

  // Keyboard navigation for suggestions
  useEffect(() => {
    if (!isOpen || suggestions.length === 0 || !editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) =>
          prev === 0 ? suggestions.length - 1 : prev - 1
        );
        return;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          e.stopPropagation();
          applySuggestion(suggestions[selectedIndex]);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        dismissedForSelectionRef.current = editor.state.selection.from;
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, suggestions, selectedIndex, applySuggestion, editor]);

  if (!isOpen || suggestions.length === 0 || !coords) return null;

  return (
    <div
      ref={listRef}
      style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
      className="fixed z-50 min-w-[220px] max-w-[340px] overflow-hidden rounded-md border border-border bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-100"
    >
      <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-between border-b border-border/40 mb-1">
        <span>Suggestions</span>
        <span className="text-[9px] font-mono opacity-70">Tab / Enter</span>
      </div>

      <div className="max-h-[220px] overflow-y-auto space-y-0.5">
        {suggestions.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(item);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded cursor-pointer transition-colors",
                isSelected
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted/50 text-foreground"
              )}
            >
              {item.type === "character" && <User className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
              {item.type === "location" && <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
              {item.type === "prefix" && <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
              {item.type === "time" && <Clock className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
              {item.type === "transition" && <ArrowRight className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
              {item.type === "shot" && <Camera className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}

              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-xs font-mono font-semibold">{item.label}</span>
                {item.sublabel && (
                  <span className="truncate text-[10px] text-muted-foreground">{item.sublabel}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
