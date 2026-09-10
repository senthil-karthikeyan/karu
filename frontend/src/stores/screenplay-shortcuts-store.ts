/**
 * Screenplay Shortcuts Store
 *
 * Single source of truth for all screenplay element keyboard shortcuts.
 * Stores default bindings and user overrides separately.
 * Persists user overrides to localStorage (non-sensitive preference data).
 *
 * Usage:
 *   const { getEffectiveHotkey, formatHotkeyForDisplay } = useShortcutsStore()
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShortcutDefinition {
  /** Unique identifier — matches ScreenplayElementType or command id */
  id: string;
  /** Human-readable label shown in toolbar and settings */
  label: string;
  /** Brief description shown in tooltips for less-obvious elements */
  description?: string;
  /** Default hotkey in TanStack Hotkeys format (Mod = Cmd on macOS, Ctrl on Win/Linux) */
  defaultHotkey: string;
  /** Category for grouping in settings */
  category: "primary" | "secondary" | "tertiary";
}

export interface ShortcutsState {
  /** User-overridden hotkeys, keyed by shortcut id */
  userBindings: Record<string, string>;
  /** All registered shortcut definitions (defaults) */
  definitions: ShortcutDefinition[];

  // Actions
  setUserBinding: (id: string, hotkey: string) => void;
  resetUserBinding: (id: string) => void;
  resetAllBindings: () => void;

  // Derived helpers
  getEffectiveHotkey: (id: string) => string;
  getEffectiveHotkeys: () => Record<string, string>;
  detectConflict: (hotkey: string, excludeId: string) => ShortcutDefinition | null;
}

// ─── Default Shortcut Definitions ────────────────────────────────────────────
// Mod+Alt+1-9 avoids conflicts with browser/OS built-in shortcuts.
// Mod resolves to Cmd on macOS, Ctrl on Windows/Linux (TanStack Hotkeys handles this).

export const DEFAULT_SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: "scene-heading",
    label: "Scene Heading",
    description: "INT./EXT. location - time of day",
    defaultHotkey: "Mod+Alt+1",
    category: "primary",
  },
  {
    id: "action",
    label: "Action",
    description: "What is seen and heard on screen",
    defaultHotkey: "Mod+Alt+2",
    category: "primary",
  },
  {
    id: "character",
    label: "Character",
    description: "Speaker name before dialogue",
    defaultHotkey: "Mod+Alt+3",
    category: "primary",
  },
  {
    id: "dialogue",
    label: "Dialogue",
    description: "What a character says",
    defaultHotkey: "Mod+Alt+4",
    category: "primary",
  },
  {
    id: "parenthetical",
    label: "Parenthetical",
    description: "How dialogue is delivered",
    defaultHotkey: "Mod+Alt+5",
    category: "secondary",
  },
  {
    id: "extension",
    label: "Extension",
    description: "V.O., O.S., PHONE — speaker modifier",
    defaultHotkey: "Mod+Alt+6",
    category: "secondary",
  },
  {
    id: "transition",
    label: "Transition",
    description: "CUT TO:, FADE OUT. etc.",
    defaultHotkey: "Mod+Alt+7",
    category: "secondary",
  },
  {
    id: "subheader",
    label: "Subheader",
    description: "Location within an existing scene",
    defaultHotkey: "Mod+Alt+8",
    category: "tertiary",
  },
  {
    id: "shot",
    label: "Shot",
    description: "Camera direction: CLOSE ON, INSERT etc.",
    defaultHotkey: "Mod+Alt+9",
    category: "tertiary",
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set, get) => ({
      userBindings: {},
      definitions: DEFAULT_SHORTCUT_DEFINITIONS,

      setUserBinding: (id, hotkey) =>
        set((state) => ({
          userBindings: { ...state.userBindings, [id]: hotkey },
        })),

      resetUserBinding: (id) =>
        set((state) => {
          const next = { ...state.userBindings };
          delete next[id];
          return { userBindings: next };
        }),

      resetAllBindings: () => set({ userBindings: {} }),

      getEffectiveHotkey: (id) => {
        const { userBindings, definitions } = get();
        if (userBindings[id]) return userBindings[id];
        const def = definitions.find((d) => d.id === id);
        return def?.defaultHotkey ?? "";
      },

      getEffectiveHotkeys: () => {
        const { definitions, getEffectiveHotkey } = get();
        return Object.fromEntries(definitions.map((d) => [d.id, getEffectiveHotkey(d.id)]));
      },

      detectConflict: (hotkey, excludeId) => {
        const { definitions, getEffectiveHotkey } = get();
        const normalized = hotkey.toLowerCase().replace(/\s+/g, "");
        return (
          definitions.find((d) => {
            if (d.id === excludeId) return false;
            const eff = getEffectiveHotkey(d.id).toLowerCase().replace(/\s+/g, "");
            return eff === normalized;
          }) ?? null
        );
      },
    }),
    {
      name: "karu:screenplay-shortcuts",
      // Only persist user overrides, not the definitions (those come from code)
      partialize: (state) => ({ userBindings: state.userBindings }),
    }
  )
);

// ─── Platform-aware display formatting ───────────────────────────────────────

/**
 * Detects whether the current platform is macOS.
 * Safe to call in SSR (returns false on server).
 */
function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent);
}

/**
 * Converts a TanStack Hotkeys format string to a human-readable platform-specific label.
 *
 * Examples:
 *   "Mod+Alt+1" → "⌘⌥1"  (macOS)
 *   "Mod+Alt+1" → "Ctrl+Alt+1"  (Windows/Linux)
 *   "Shift+S"   → "⇧S"  (macOS) / "Shift+S" (Win)
 */
export function formatHotkeyForDisplay(hotkey: string): string {
  if (!hotkey) return "";
  const mac = isMacOS();

  const parts = hotkey.split("+");
  return parts
    .map((part) => {
      switch (part.toLowerCase()) {
        case "mod":
          return mac ? "⌘" : "Ctrl";
        case "alt":
          return mac ? "⌥" : "Alt";
        case "shift":
          return mac ? "⇧" : "Shift";
        case "ctrl":
          return "Ctrl";
        case "meta":
          return mac ? "⌘" : "Win";
        default:
          // Numeric keys and letters stay as-is
          return part.toUpperCase().length === 1 ? part.toUpperCase() : part;
      }
    })
    .join(mac ? "" : "+");
}
