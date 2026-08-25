import { Node, Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export const screenplayPaginationPluginKey = new PluginKey("screenplayPagination");

export const ScreenplayParagraph = Node.create({
  name: "paragraph",
  priority: 1000,
  group: "block",
  content: "inline*",

  addAttributes() {
    return {
      dataType: {
        default: "action",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-type") || "action",
        renderHTML: (attributes: Record<string, string | number | undefined>) => {
          return {
            "data-type": attributes.dataType || "action",
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "p" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string | number | undefined> }) {
    return ["p", HTMLAttributes, 0];
  },
});

export const ScreenplayHeading = Node.create({
  name: "heading",
  priority: 1000,
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      level: {
        default: 2,
        parseHTML: (element: HTMLElement) => {
          const level = Number(element.tagName.replace("H", ""));
          return isNaN(level) ? 2 : level;
        },
        renderHTML: () => ({}),
      },
      dataType: {
        default: "scene-heading",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-type") || "scene-heading",
        renderHTML: (attributes: Record<string, string | number | undefined>) => ({
          "data-type": attributes.dataType || "scene-heading",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "h2" }, { tag: "h1" }, { tag: "h3" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string | number | undefined> }) {
    return ["h2", HTMLAttributes, 0];
  },
});

export const ScreenplayShortcuts = Extension.create({
  name: "screenplayShortcuts",

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const isHeading = this.editor.isActive("heading");
        const currentType = isHeading
          ? "scene-heading"
          : (this.editor.getAttributes("paragraph").dataType as string) || "action";

        const cycleMap: Record<string, string> = {
          action: "character",
          character: "dialogue",
          dialogue: "parenthetical",
          parenthetical: "transition",
          transition: "scene-heading",
          "scene-heading": "action",
        };

        const next = cycleMap[currentType] || "action";
        if (next === "scene-heading") {
          this.editor.chain().focus().setHeading({ level: 2 }).run();
        } else {
          this.editor.chain().focus().setNode("paragraph", { dataType: next }).run();
        }
        return true;
      },

      Enter: () => {
        const isHeading = this.editor.isActive("heading");
        if (isHeading) {
          this.editor.chain().splitBlock().setNode("paragraph", { dataType: "action" }).run();
          return true;
        }

        const currentType = (this.editor.getAttributes("paragraph").dataType as string) || "action";
        if (currentType === "character") {
          this.editor.chain().splitBlock().setNode("paragraph", { dataType: "dialogue" }).run();
          return true;
        }
        if (currentType === "parenthetical") {
          this.editor.chain().splitBlock().setNode("paragraph", { dataType: "dialogue" }).run();
          return true;
        }
        if (currentType === "dialogue") {
          this.editor.chain().splitBlock().setNode("paragraph", { dataType: "action" }).run();
          return true;
        }
        if (currentType === "transition") {
          this.editor.chain().splitBlock().setHeading({ level: 2 }).run();
          return true;
        }

        return false;
      },
    };
  },
});

export function estimateBlockHeight(node: PMNode): number {
  const type = (node.attrs.dataType as string) || (node.type.name === "heading" ? "scene-heading" : "action");
  const text = node.textContent || "";
  const len = text.length;

  if (type === "scene-heading") {
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
