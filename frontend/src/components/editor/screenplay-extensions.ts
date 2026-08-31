import { Node, Extension, textblockTypeInputRule } from "@tiptap/react";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { Fragment, Slice, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import type { TipTapDocumentJSON } from "@/lib/crypto/crypto-types";

export const screenplayPaginationPluginKey = new PluginKey("screenplayPagination");
export const screenplayAutoFormattingPluginKey = new PluginKey("screenplayAutoFormatting");
export const screenplayPasteHandlerPluginKey = new PluginKey("screenplayPasteHandler");
export const screenplaySmartDetectionPluginKey = new PluginKey("screenplaySmartDetection");

/**
 * Semantic Node: SceneHeading
 * Renders as <h2 data-type="scene-heading">
 */
export const SceneHeading = Node.create({
  name: "sceneHeading",
  priority: 1000,
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      dataType: {
        default: "scene-heading",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-type") || "scene-heading",
        renderHTML: () => ({ "data-type": "scene-heading" }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'h2[data-type="scene-heading"]' },
      { tag: 'p[data-type="scene-heading"]' },
      { tag: 'div[data-type="scene-heading"]' },
      { tag: "h2", priority: 80 },
      { tag: "h1", priority: 70 },
      { tag: "h3", priority: 60 },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["h2", { ...HTMLAttributes, "data-type": "scene-heading" }, 0];
  },
});

/**
 * Semantic Node: Action
 * Renders as <p data-type="action">
 */
export const Action = Node.create({
  name: "action",
  priority: 900,
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      dataType: {
        default: "action",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-type") || "action",
        renderHTML: () => ({ "data-type": "action" }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'p[data-type="action"]' },
      { tag: 'div[data-type="action"]' },
      { tag: "p", priority: 40 },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", { ...HTMLAttributes, "data-type": "action" }, 0];
  },
});

/**
 * Semantic Node: Character
 * Renders as <p data-type="character">
 */
export const Character = Node.create({
  name: "character",
  priority: 1000,
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      dataType: {
        default: "character",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-type") || "character",
        renderHTML: () => ({ "data-type": "character" }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'p[data-type="character"]' },
      { tag: 'div[data-type="character"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", { ...HTMLAttributes, "data-type": "character" }, 0];
  },
});

/**
 * Semantic Node: Dialogue
 * Renders as <p data-type="dialogue">
 */
export const Dialogue = Node.create({
  name: "dialogue",
  priority: 1000,
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      dataType: {
        default: "dialogue",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-type") || "dialogue",
        renderHTML: () => ({ "data-type": "dialogue" }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'p[data-type="dialogue"]' },
      { tag: 'div[data-type="dialogue"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", { ...HTMLAttributes, "data-type": "dialogue" }, 0];
  },
});

/**
 * Semantic Node: Parenthetical
 * Renders as <p data-type="parenthetical">
 */
export const Parenthetical = Node.create({
  name: "parenthetical",
  priority: 1000,
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      dataType: {
        default: "parenthetical",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-type") || "parenthetical",
        renderHTML: () => ({ "data-type": "parenthetical" }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'p[data-type="parenthetical"]' },
      { tag: 'div[data-type="parenthetical"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", { ...HTMLAttributes, "data-type": "parenthetical" }, 0];
  },
});

/**
 * Semantic Node: Transition
 * Renders as <p data-type="transition">
 */
export const Transition = Node.create({
  name: "transition",
  priority: 1000,
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      dataType: {
        default: "transition",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-type") || "transition",
        renderHTML: () => ({ "data-type": "transition" }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'p[data-type="transition"]' },
      { tag: 'div[data-type="transition"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", { ...HTMLAttributes, "data-type": "transition" }, 0];
  },
});

/**
 * Semantic Node: Shot
 * Renders as <p data-type="shot">
 */
export const Shot = Node.create({
  name: "shot",
  priority: 1000,
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      dataType: {
        default: "shot",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-type") || "shot",
        renderHTML: () => ({ "data-type": "shot" }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'p[data-type="shot"]' },
      { tag: 'div[data-type="shot"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", { ...HTMLAttributes, "data-type": "shot" }, 0];
  },
});

/**
 * All Screenplay Semantic Nodes
 */
export const ScreenplayNodes = [
  SceneHeading,
  Action,
  Character,
  Dialogue,
  Parenthetical,
  Transition,
  Shot,
];

/**
 * Backward compatibility alias nodes
 */
export const ScreenplayParagraph = Action;
export const ScreenplayHeading = SceneHeading;

/**
 * Helper to get the active screenplay node type
 */
export function getActiveScreenplayType(editor: {
  isActive: (name: string, attrs?: Record<string, unknown>) => boolean;
  getAttributes: (name: string) => Record<string, unknown>;
}): string {
  if (editor.isActive("sceneHeading") || editor.isActive("heading")) return "scene-heading";
  if (editor.isActive("character")) return "character";
  if (editor.isActive("dialogue")) return "dialogue";
  if (editor.isActive("parenthetical")) return "parenthetical";
  if (editor.isActive("transition")) return "transition";
  if (editor.isActive("shot")) return "shot";
  return "action";
}

/**
 * Normalizes legacy TipTap JSON AST into semantic screenplay nodes
 */
export function normalizeScreenplayDoc(doc: TipTapDocumentJSON): TipTapDocumentJSON {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return {
      type: "doc",
      content: [{ type: "action", content: [{ type: "text", text: "" }] }],
    };
  }

  const normalizedContent = doc.content.map((node) => {
    let typeName = node.type;
    const dataType =
      (node.attrs?.dataType as string) ||
      (node.attrs?.["data-type"] as string) ||
      "action";

    if (typeName === "heading" || dataType === "scene-heading") {
      typeName = "sceneHeading";
    } else if (typeName === "paragraph") {
      if (dataType === "character") typeName = "character";
      else if (dataType === "dialogue") typeName = "dialogue";
      else if (dataType === "parenthetical") typeName = "parenthetical";
      else if (dataType === "transition") typeName = "transition";
      else if (dataType === "shot") typeName = "shot";
      else typeName = "action";
    }

    return {
      ...node,
      type: typeName,
      attrs: {
        ...node.attrs,
        dataType:
          typeName === "sceneHeading"
            ? "scene-heading"
            : typeName,
      },
    };
  });

  return {
    ...doc,
    type: "doc",
    content: normalizedContent,
  };
}

/**
 * Automatic Screenplay Formatting Extension:
 * - Enforces uppercase text transformations in document state for SceneHeading, Character, Transition, Shot
 * - Provides Fountain / smart input rules (INT., EXT., CUT TO:, @, ., >)
 */
export const ScreenplayAutoFormatting = Extension.create({
  name: "screenplayAutoFormatting",

  addInputRules() {
    const nodes = this.editor.schema.nodes;

    return [
      // Scene Heading input rules (e.g. typing "INT. " or "EXT. " or ".")
      textblockTypeInputRule({
        find: /^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s$/i,
        type: nodes.sceneHeading,
      }),
      textblockTypeInputRule({
        find: /^\.\s$/,
        type: nodes.sceneHeading,
      }),
      // Transition input rules (e.g. typing "CUT TO: " or "> ")
      textblockTypeInputRule({
        find: /^(?:CUT TO|FADE IN|FADE OUT|SMASH CUT TO|DISSOLVE TO):?\s$/i,
        type: nodes.transition,
      }),
      textblockTypeInputRule({
        find: /^>\s$/,
        type: nodes.transition,
      }),
      // Character input rule (e.g. typing "@ ")
      textblockTypeInputRule({
        find: /^@\s$/,
        type: nodes.character,
      }),
      // Shot input rule (e.g. typing "CLOSE ON ")
      textblockTypeInputRule({
        find: /^(?:CLOSE ON|ANGLE ON|WIDE SHOT|POV|INSERT|ESTABLISHING):?\s$/i,
        type: nodes.shot,
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: screenplayAutoFormattingPluginKey,
        appendTransaction(transactions, _oldState, newState) {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          let tr: Transaction | null = null;

          newState.doc.descendants((node, pos) => {
            const typeName = node.type.name;
            const isUppercaseType =
              typeName === "character" ||
              typeName === "sceneHeading" ||
              typeName === "transition" ||
              typeName === "shot";

            if (isUppercaseType && node.isTextblock) {
              node.forEach((child, offset) => {
                if (child.isText && child.text) {
                  const upperText = child.text.toUpperCase();
                  if (child.text !== upperText) {
                    if (!tr) tr = newState.tr;
                    const from = pos + 1 + offset;
                    const to = from + child.text.length;
                    tr.replaceWith(from, to, newState.schema.text(upperText, child.marks));
                  }
                }
              });
            }
          });

          return tr;
        },
      }),
    ];
  },
});

/**
 * Keyboard shortcuts extension for screenplay writing
 */
export const ScreenplayShortcuts = Extension.create({
  name: "screenplayShortcuts",

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const currentType = getActiveScreenplayType(this.editor);

        const cycleMap: Record<string, string> = {
          action: "character",
          character: "dialogue",
          dialogue: "parenthetical",
          parenthetical: "transition",
          transition: "shot",
          shot: "sceneHeading",
          "scene-heading": "action",
          sceneHeading: "action",
        };

        const next = cycleMap[currentType] || "action";
        this.editor.chain().focus().setNode(next).run();
        return true;
      },

      "Shift-Tab": () => {
        const currentType = getActiveScreenplayType(this.editor);

        const reverseCycleMap: Record<string, string> = {
          action: "sceneHeading",
          sceneHeading: "shot",
          "scene-heading": "shot",
          shot: "transition",
          transition: "parenthetical",
          parenthetical: "dialogue",
          dialogue: "character",
          character: "action",
        };

        const prev = reverseCycleMap[currentType] || "action";
        this.editor.chain().focus().setNode(prev).run();
        return true;
      },

      Enter: () => {
        const currentType = getActiveScreenplayType(this.editor);
        const { $anchor } = this.editor.state.selection;
        const textInCurrentBlock = $anchor.parent.textContent.trim();

        if (currentType === "scene-heading" || currentType === "sceneHeading") {
          this.editor.chain().splitBlock().setNode("action").run();
          return true;
        }

        if (currentType === "character") {
          if (textInCurrentBlock.length === 0) {
            // Empty character block -> convert to action
            this.editor.chain().focus().setNode("action").run();
            return true;
          }
          this.editor.chain().splitBlock().setNode("dialogue").run();
          return true;
        }

        if (currentType === "parenthetical") {
          this.editor.chain().splitBlock().setNode("dialogue").run();
          return true;
        }

        if (currentType === "dialogue") {
          if (textInCurrentBlock.length === 0) {
            // Empty dialogue line on double enter -> convert to action
            this.editor.chain().focus().setNode("action").run();
            return true;
          }
          this.editor.chain().splitBlock().setNode("action").run();
          return true;
        }

        if (currentType === "transition") {
          this.editor.chain().splitBlock().setNode("sceneHeading").run();
          return true;
        }

        if (currentType === "shot") {
          this.editor.chain().splitBlock().setNode("action").run();
          return true;
        }

        return false;
      },

      Backspace: () => {
        const { empty, $anchor } = this.editor.state.selection;
        if (!empty) return false;

        const currentType = getActiveScreenplayType(this.editor);
        const isStartOfBlock = $anchor.parentOffset === 0;
        const isBlockEmpty = $anchor.parent.textContent.length === 0;

        // If backspacing on an empty specialized block, reset to action first
        if (isStartOfBlock && isBlockEmpty && currentType !== "action") {
          this.editor.chain().focus().setNode("action").run();
          return true;
        }

        return false;
      },

      // Fast formatting shortcuts (Mod-Alt-1 to Mod-Alt-7)
      "Mod-Alt-1": () => this.editor.chain().focus().setNode("sceneHeading").run(),
      "Mod-Alt-2": () => this.editor.chain().focus().setNode("action").run(),
      "Mod-Alt-3": () => this.editor.chain().focus().setNode("character").run(),
      "Mod-Alt-4": () => this.editor.chain().focus().setNode("dialogue").run(),
      "Mod-Alt-5": () => this.editor.chain().focus().setNode("parenthetical").run(),
      "Mod-Alt-6": () => this.editor.chain().focus().setNode("transition").run(),
      "Mod-Alt-7": () => this.editor.chain().focus().setNode("shot").run(),
    };
  },
});

export function estimateBlockHeight(node: PMNode): number {
  const type =
    (node.attrs?.dataType as string) ||
    (node.type.name === "sceneHeading" || node.type.name === "heading"
      ? "scene-heading"
      : node.type.name || "action");

  const text = node.textContent || "";
  const len = text.length;

  if (type === "scene-heading" || type === "sceneHeading") {
    return 68;
  }
  if (type === "character") {
    return 42;
  }
  if (type === "parenthetical") {
    return 22;
  }
  if (type === "dialogue") {
    const lines = Math.max(1, Math.ceil(len / 45));
    return lines * 21 + 14;
  }
  if (type === "transition") {
    return 60;
  }
  if (type === "shot") {
    return 56;
  }
  const lines = Math.max(1, Math.ceil(len / 72));
  return lines * 21 + 14;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createPageBreakWidget(pageNumber: number, title: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "screenplay-page-break-widget";
  wrapper.contentEditable = "false";
  wrapper.setAttribute("data-page-break", String(pageNumber));

  wrapper.innerHTML = `
    <div class="screenplay-page-bottom-strip">
      <div class="screenplay-page-bottom-line"></div>
    </div>
    <div class="screenplay-page-gap">
      <div class="screenplay-page-gap-indicator">
        <span class="screenplay-page-gap-line"></span>
        <span class="screenplay-page-gap-badge">Page ${pageNumber}</span>
        <span class="screenplay-page-gap-line"></span>
      </div>
    </div>
    <div class="screenplay-page-top-strip">
      <div class="screenplay-page-header">
        <span class="screenplay-header-title">${escapeHtml(title.toUpperCase())}</span>
        <span class="screenplay-header-number">${pageNumber}.</span>
      </div>
    </div>
  `;

  return wrapper;
}

export function computePaginationDecorations(
  view: EditorView | null,
  doc: PMNode,
  title: string,
  pageUsableHeight: number = 840
): { decorations: DecorationSet; pageCount: number } {
  const decos: Decoration[] = [];
  let accumulatedHeight = 0;
  let currentPage = 1;
  let pos = 0;

  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    const nodePos = pos;

    let height = estimateBlockHeight(child);

    if (view && view.dom) {
      try {
        const domNode = view.nodeDOM(nodePos) as HTMLElement | null;
        if (domNode && domNode.offsetHeight > 0) {
          const style = window.getComputedStyle(domNode);
          const mt = parseFloat(style.marginTop) || 0;
          const mb = parseFloat(style.marginBottom) || 0;
          height = domNode.offsetHeight + mt + mb;
        }
      } catch {
        // fallback to estimate
      }
    }

    if (accumulatedHeight + height > pageUsableHeight && accumulatedHeight > 0) {
      currentPage++;
      const pageNum = currentPage;

      decos.push(
        Decoration.widget(
          nodePos,
          () => createPageBreakWidget(pageNum, title),
          {
            side: -1,
            stopEvent: () => true,
            key: `page-break-${pageNum}-${nodePos}`,
          }
        )
      );

      accumulatedHeight = height;
    } else {
      accumulatedHeight += height;
    }

    pos += child.nodeSize;
  }

  return {
    decorations: DecorationSet.create(doc, decos),
    pageCount: currentPage,
  };
}

export interface ScreenplayPaginationOptions {
  projectTitle: string;
  pageUsableHeight?: number;
  onPageCountChange?: (pages: number) => void;
}

export const ScreenplayPagination = Extension.create<ScreenplayPaginationOptions>({
  name: "screenplayPagination",

  addOptions() {
    return {
      projectTitle: "UNTITLED SCREENPLAY",
      pageUsableHeight: 840,
      onPageCountChange: undefined,
    };
  },

  addProseMirrorPlugins() {
    const opts = this.options;
    let editorViewRef: EditorView | null = null;
    let lastReportedPageCount = 1;

    return [
      new Plugin({
        key: screenplayPaginationPluginKey,
        state: {
          init(_, { doc }) {
            const { decorations, pageCount } = computePaginationDecorations(
              null,
              doc,
              opts.projectTitle,
              opts.pageUsableHeight
            );
            lastReportedPageCount = pageCount;
            opts.onPageCountChange?.(pageCount);
            return decorations;
          },
          apply(tr, oldDecos, oldState, newState) {
            if (tr.docChanged || tr.getMeta(screenplayPaginationPluginKey)) {
              const { decorations, pageCount } = computePaginationDecorations(
                editorViewRef,
                newState.doc,
                opts.projectTitle,
                opts.pageUsableHeight
              );
              if (pageCount !== lastReportedPageCount) {
                lastReportedPageCount = pageCount;
                opts.onPageCountChange?.(pageCount);
              }
              return decorations;
            }
            return oldDecos.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state) || DecorationSet.empty;
          },
        },
        view(view) {
          editorViewRef = view;

          // Initial measure once DOM is attached
          requestAnimationFrame(() => {
            if (!view.isDestroyed) {
              view.dispatch(view.state.tr.setMeta(screenplayPaginationPluginKey, true));
            }
          });

          return {
            destroy() {
              editorViewRef = null;
            },
          };
        },
      }),
    ];
  },
});

export const SCENE_HEADING_PATTERN =
  /^(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.|INT\.\/EXT\.|EST\.)\s+[A-Z0-9\s.,'/-]+(?:-\s*(?:DAY|NIGHT|DAWN|DUSK|CONTINUOUS|LATER|MOMENTS LATER|SAME TIME))?/i;

export const TRANSITION_PATTERN =
  /^(?:CUT TO:|FADE IN:|FADE OUT\.|FADE OUT:|SMASH CUT TO:|DISSOLVE TO:|MATCH CUT TO:|JUMP CUT TO:|BACK TO SCENE:|INTERCUT:|FAST CUT TO:|CROSSFADE:)\s*$/i;

export const SHOT_PATTERN =
  /^(?:CLOSE ON|CLOSE UP|ANGLE ON|WIDE SHOT|POV|INSERT|ESTABLISHING|TRACKING SHOT|AERIAL SHOT)\s*[:-]?\s*.+/i;

export const PARENTHETICAL_PATTERN = /^\s*\([^)]*\)\s*$/;

export const CHARACTER_PATTERN =
  /^[A-Z0-9\s._'-]{2,35}(?:\s*\((?:V\.O\.|O\.S\.|CONT'D|FILTERED|PRE-LAP|SUBTITLE|M\.O\.S\.)\))?$/;

/**
 * Parses raw text lines into structured ProseMirror screenplay nodes.
 */
export function parseScreenplayTextToNodes(
  text: string,
  schema: Schema
): PMNode[] {
  const lines = text.split(/\r?\n/);
  const nodes: PMNode[] = [];
  let prevType = "action";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    let nodeType = "action";

    if (SCENE_HEADING_PATTERN.test(trimmed) || /^\.[A-Z]/.test(trimmed)) {
      nodeType = "sceneHeading";
    } else if (TRANSITION_PATTERN.test(trimmed) || /^>[^<]/.test(trimmed)) {
      nodeType = "transition";
    } else if (SHOT_PATTERN.test(trimmed)) {
      nodeType = "shot";
    } else if (
      PARENTHETICAL_PATTERN.test(trimmed) &&
      (prevType === "character" || prevType === "dialogue")
    ) {
      nodeType = "parenthetical";
    } else if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length <= 35 &&
      (prevType === "action" ||
        prevType === "sceneHeading" ||
        prevType === "dialogue" ||
        prevType === "transition" ||
        prevType === "shot") &&
      !SCENE_HEADING_PATTERN.test(trimmed) &&
      !TRANSITION_PATTERN.test(trimmed) &&
      !SHOT_PATTERN.test(trimmed)
    ) {
      nodeType = "character";
    } else if (prevType === "character" || prevType === "parenthetical") {
      nodeType = "dialogue";
    } else {
      nodeType = "action";
    }

    prevType = nodeType;
    const cleanText = trimmed.replace(/^[@.>~]/, "").trim();
    const targetNodeType = schema.nodes[nodeType] || schema.nodes.action;
    if (targetNodeType) {
      nodes.push(
        targetNodeType.create(
          { dataType: nodeType === "sceneHeading" ? "scene-heading" : nodeType },
          cleanText ? [schema.text(cleanText)] : []
        )
      );
    }
  }

  return nodes;
}

/**
 * Screenplay Paste Handler:
 * Converts multi-line pasted plain text or screenplay formats directly into semantic TipTap nodes.
 */
export const ScreenplayPasteHandler = Extension.create({
  name: "screenplayPasteHandler",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: screenplayPasteHandlerPluginKey,
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain");
            if (!text || !text.includes("\n")) {
              return false;
            }

            const nodes = parseScreenplayTextToNodes(text, view.state.schema);
            if (nodes.length > 0) {
              const fragment = Fragment.fromArray(nodes);
              const slice = new Slice(fragment, 0, 0);
              const tr = view.state.tr.replaceSelection(slice);
              view.dispatch(tr);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Screenplay Smart Element Detection:
 * Automatically converts action blocks into sceneHeading, transition, or shot when recognized patterns are typed.
 */
export const ScreenplaySmartDetection = Extension.create({
  name: "screenplaySmartDetection",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: screenplaySmartDetectionPluginKey,
        appendTransaction(transactions, _oldState, newState) {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          let tr: Transaction | null = null;
          const { selection } = newState;
          const { $anchor } = selection;
          const currentNode = $anchor.parent;

          if (currentNode && currentNode.type.name === "action") {
            const text = currentNode.textContent.trim();

            if (SCENE_HEADING_PATTERN.test(text)) {
              if (!tr) tr = newState.tr;
              const pos = $anchor.before($anchor.depth);
              tr.setNodeMarkup(pos, newState.schema.nodes.sceneHeading, {
                dataType: "scene-heading",
              });
            } else if (TRANSITION_PATTERN.test(text)) {
              if (!tr) tr = newState.tr;
              const pos = $anchor.before($anchor.depth);
              tr.setNodeMarkup(pos, newState.schema.nodes.transition, {
                dataType: "transition",
              });
            } else if (SHOT_PATTERN.test(text)) {
              if (!tr) tr = newState.tr;
              const pos = $anchor.before($anchor.depth);
              tr.setNodeMarkup(pos, newState.schema.nodes.shot, {
                dataType: "shot",
              });
            }
          }

          return tr;
        },
      }),
    ];
  },
});
