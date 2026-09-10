/**
 * Screenplay Context Utilities
 *
 * Provides reusable, AST-based utilities for querying the current screenplay
 * document state from a TipTap editor. These are the foundation for:
 *  - Intelligent element suggestions (Phase 3)
 *  - Scene extraction for the scene navigator
 *  - Context-aware toolbar state
 *  - Future export/import pipeline
 *
 * All functions operate on the ProseMirror document AST directly —
 * never on HTML strings or CSS class inference.
 */
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { SceneItem } from "@/types/screenplay";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScreenplayContextInfo {
  /** The type name of the node at cursor position */
  currentType: string;
  /** The type name of the block immediately before cursor's block, or null */
  previousType: string | null;
  /** The type name of the block immediately after cursor's block, or null */
  nextType: string | null;
  /** Likely next element types based on screenplay convention */
  nextLikelyTypes: string[];
  /** The scene heading text of the current scene, or null if not in a scene */
  currentScene: { heading: string; sceneIndex: number } | null;
  /** ProseMirror document position of the cursor anchor */
  cursorPosition: number;
}

export interface SceneBlock {
  /** 1-based scene number */
  index: number;
  /** Text content of the scene heading */
  heading: string;
  /** ProseMirror position of the scene heading node */
  pos: number;
  /** All block node types within this scene */
  elementTypes: string[];
}

// ─── Next-element Transition Table ───────────────────────────────────────────
// Encodes standard screenplay flow conventions.
// Used by suggestions and context-aware features.

const NEXT_LIKELY_ELEMENTS: Record<string, string[]> = {
  "scene-heading": ["action", "character"],
  sceneHeading: ["action", "character"],
  action: ["character", "scene-heading", "transition"],
  character: ["dialogue", "parenthetical"],
  extension: ["dialogue", "parenthetical"],
  dialogue: ["action", "character", "parenthetical", "transition"],
  parenthetical: ["dialogue"],
  transition: ["scene-heading"],
  subheader: ["action", "character"],
  shot: ["action", "character"],
};

/**
 * Returns the likely next screenplay element types for a given current type.
 * Used as the foundation for Phase 3 intelligent suggestions.
 */
export function getNextLikelyElements(currentType: string): string[] {
  return NEXT_LIKELY_ELEMENTS[currentType] ?? ["action"];
}

// ─── Active Element Detection ─────────────────────────────────────────────────

/**
 * Returns the canonical element type name for the block at the cursor.
 * Normalises legacy type names (e.g. "heading" → "scene-heading").
 */
export function getActiveElementType(editor: Editor): string {
  if (editor.isActive("sceneHeading") || editor.isActive("heading")) return "scene-heading";
  if (editor.isActive("character")) return "character";
  if (editor.isActive("dialogue")) return "dialogue";
  if (editor.isActive("parenthetical")) return "parenthetical";
  if (editor.isActive("extension")) return "extension";
  if (editor.isActive("transition")) return "transition";
  if (editor.isActive("subheader")) return "subheader";
  if (editor.isActive("shot")) return "shot";
  return "action";
}

// ─── Full Context Query ───────────────────────────────────────────────────────

/**
 * Returns full screenplay context at the current cursor position.
 * Performs a single pass over the document AST.
 */
export function getCurrentScreenplayContext(editor: Editor): ScreenplayContextInfo {
  const { state } = editor;
  const { selection, doc } = state;
  const { $anchor } = selection;
  const cursorPos = $anchor.pos;

  const currentType = getActiveElementType(editor);

  // Walk doc to find previous, next, and current scene
  const blocks: Array<{ type: string; pos: number }> = [];
  doc.forEach((node, pos) => {
    blocks.push({ type: normalizeNodeType(node), pos });
  });

  // Find which block index the cursor is in
  let cursorBlockIdx = 0;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const node = doc.nodeAt(block.pos);
    if (node && block.pos <= cursorPos && cursorPos <= block.pos + node.nodeSize) {
      cursorBlockIdx = i;
      break;
    }
  }

  const previousType = cursorBlockIdx > 0 ? blocks[cursorBlockIdx - 1].type : null;
  const nextType = cursorBlockIdx < blocks.length - 1 ? blocks[cursorBlockIdx + 1].type : null;

  // Find current scene (look backwards for scene heading)
  let currentScene: ScreenplayContextInfo["currentScene"] = null;
  let sceneIndex = 0;
  for (let i = cursorBlockIdx; i >= 0; i--) {
    const b = blocks[i];
    if (b.type === "scene-heading") {
      const node = doc.nodeAt(b.pos);
      sceneIndex++;
      currentScene = {
        heading: node?.textContent ?? "",
        sceneIndex,
      };
      break;
    }
  }

  return {
    currentType,
    previousType,
    nextType,
    nextLikelyTypes: getNextLikelyElements(currentType),
    currentScene,
    cursorPosition: cursorPos,
  };
}

// ─── Scene Extraction from Document AST ──────────────────────────────────────

/**
 * Extracts all scenes directly from the ProseMirror document AST.
 * This is the authoritative, AST-based replacement for HTML-string parsing.
 *
 * Each scene begins at a sceneHeading node and extends until the next
 * sceneHeading or end of document.
 */
export function extractScenesFromDoc(doc: PMNode): SceneBlock[] {
  const scenes: SceneBlock[] = [];
  let currentScene: SceneBlock | null = null;

  doc.forEach((node, pos) => {
    const type = normalizeNodeType(node);

    if (type === "scene-heading") {
      // Push previous scene
      if (currentScene) {
        scenes.push(currentScene);
      }
      currentScene = {
        index: scenes.length + 1,
        heading: node.textContent.trim(),
        pos,
        elementTypes: ["scene-heading"],
      };
    } else if (currentScene) {
      currentScene.elementTypes.push(type);
    }
  });

  if (currentScene) {
    scenes.push(currentScene);
  }

  return scenes;
}

/**
 * Converts extracted SceneBlocks to SceneItem format used by the SceneNavigator.
 * Replaces the HTML-parsing extractScenesFromHtml in screenplay-editor.tsx.
 */
export function sceneBlocksToSceneItems(scenes: SceneBlock[]): SceneItem[] {
  return scenes.map((scene) => {
    const slugline = scene.heading || `SCENE ${scene.index}`;
    const timeMatch = slugline.match(/\b(DAY|NIGHT|DAWN|DUSK|CONTINUOUS|LATER)\b/i);
    const time = (
      timeMatch ? timeMatch[0].toUpperCase() : "DAY"
    ) as SceneItem["time"];

    // Extract location from slugline (remove INT./EXT. prefix and time suffix)
    const locationRaw = slugline
      .replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*/i, "")
      .split(/\s*-\s*/)[0]
      ?.trim();

    return {
      id: `sc-${scene.index}`,
      number: scene.index,
      slugline,
      location: locationRaw || "LOCATION",
      time,
      pageNumber: Math.max(1, Math.ceil((scene.index * 3) - 2)),
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalises a ProseMirror node to its canonical screenplay element type name.
 */
function normalizeNodeType(node: PMNode): string {
  const name = node.type.name;
  if (name === "sceneHeading" || name === "heading") return "scene-heading";
  return name;
}
