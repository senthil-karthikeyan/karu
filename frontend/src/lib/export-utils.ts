import type { ExportOptions, Project } from "@/types/screenplay";
import type { TipTapDocumentJSON, TipTapNodeJSON } from "./crypto";

/**
 * Calculates approximate block height for typography pagination
 */
function estimateElementHeight(type: string, text: string): number {
  const len = text.length;
  if (type === "scene-heading" || type === "sceneHeading" || type === "h2") {
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

/**
 * Splits screenplay HTML content into individual physical page HTML segments with orphan protection
 */
export function paginateScreenplayHtml(html: string, pageUsableHeight: number = 840): string[] {
  if (typeof window === "undefined" || !html.trim()) {
    return [html || '<p data-type="action">No screenplay content.</p>'];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const elements = Array.from(doc.body.children);

  if (elements.length === 0) {
    return [html];
  }

  const pages: string[] = [];
  let currentPageElements: string[] = [];
  let currentHeight = 0;

  // Pre-calculate heights
  const heights = elements.map((el) => {
    const text = el.textContent || "";
    const type = el.getAttribute("data-type") || el.tagName.toLowerCase();
    return estimateElementHeight(type, text);
  });

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const height = heights[i];
    const type = el.getAttribute("data-type") || el.tagName.toLowerCase();
    const nextHeight = i + 1 < elements.length ? heights[i + 1] : 0;

    let shouldForceBreakBefore = false;

    if (currentHeight > 0) {
      // 1. Orphan Scene Heading: if scene heading + next block exceed page, push scene heading to new page
      if (type === "scene-heading" || type === "h2") {
        if (currentHeight + height + Math.min(nextHeight, 40) > pageUsableHeight) {
          shouldForceBreakBefore = true;
        }
      }
      // 2. Orphan Character: if character cue + dialogue exceed page, push character to new page
      else if (type === "character") {
        if (currentHeight + height + Math.min(nextHeight, 35) > pageUsableHeight) {
          shouldForceBreakBefore = true;
        }
      }
      // 3. Orphan Parenthetical: if parenthetical + dialogue exceed page, push to new page
      else if (type === "parenthetical") {
        if (currentHeight + height + Math.min(nextHeight, 30) > pageUsableHeight) {
          shouldForceBreakBefore = true;
        }
      }
    }

    if (shouldForceBreakBefore || (currentHeight + height > pageUsableHeight && currentPageElements.length > 0)) {
      pages.push(currentPageElements.join("\n"));
      currentPageElements = [el.outerHTML];
      currentHeight = height;
    } else {
      currentPageElements.push(el.outerHTML);
      currentHeight += height;
    }
  }

  if (currentPageElements.length > 0) {
    pages.push(currentPageElements.join("\n"));
  }

  return pages.length > 0 ? pages : [html];
}

/**
 * Converts TipTap Document AST directly to Fountain format
 */
export function astToFountain(doc: TipTapDocumentJSON, project: Project): string {
  let fountain = `Title: ${project.title}\nCredit: Written by\nDraft date: ${new Date().toLocaleDateString()}\n\n`;

  if (!doc.content || !Array.isArray(doc.content)) {
    return fountain;
  }

  for (const node of doc.content) {
    const text = (node.content || [])
      .map((c: TipTapNodeJSON) => c.text || "")
      .join("")
      .trim();

    if (node.type === "sceneHeading") {
      fountain += `\n.${text.toUpperCase()}\n\n`;
    } else if (node.type === "character") {
      fountain += `\n@${text.toUpperCase()}\n`;
    } else if (node.type === "parenthetical") {
      fountain += `(${text.replace(/^\(|\)$/g, "")})\n`;
    } else if (node.type === "dialogue") {
      fountain += `${text}\n\n`;
    } else if (node.type === "transition") {
      fountain += `\n>${text.toUpperCase()}\n\n`;
    } else if (node.type === "shot") {
      fountain += `\n${text.toUpperCase()}\n\n`;
    } else {
      fountain += `${text}\n\n`;
    }
  }

  return fountain.trim();
}

/**
 * Converts rich screenplay HTML into plain Fountain format
 */
export function htmlToFountain(html: string, project: Project): string {
  let fountain = `Title: ${project.title}\nCredit: Written by\nDraft date: ${new Date().toLocaleDateString()}\n\n`;

  if (typeof window !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const elements = doc.body.children;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const text = el.textContent?.trim() || "";
      const type = el.getAttribute("data-type") || el.tagName.toLowerCase();

      if (type === "scene-heading" || el.tagName === "H2") {
        fountain += `\n.${text.toUpperCase()}\n\n`;
      } else if (type === "character") {
        fountain += `\n@${text.toUpperCase()}\n`;
      } else if (type === "parenthetical") {
        fountain += `(${text.replace(/^\(|\)$/g, "")})\n`;
      } else if (type === "dialogue") {
        fountain += `${text}\n\n`;
      } else if (type === "transition") {
        fountain += `\n>${text.toUpperCase()}\n\n`;
      } else if (type === "shot") {
        fountain += `\n${text.toUpperCase()}\n\n`;
      } else {
        fountain += `${text}\n\n`;
      }
    }
  } else {
    fountain += html
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n.$1\n\n")
      .replace(/<p[^>]*data-type="character"[^>]*>(.*?)<\/p>/gi, "\n@$1\n")
      .replace(/<p[^>]*data-type="parenthetical"[^>]*>(.*?)<\/p>/gi, "($1)\n")
      .replace(/<p[^>]*data-type="dialogue"[^>]*>(.*?)<\/p>/gi, "$1\n\n")
      .replace(/<p[^>]*data-type="transition"[^>]*>(.*?)<\/p>/gi, "\n>$1\n\n")
      .replace(/<p[^>]*data-type="shot"[^>]*>(.*?)<\/p>/gi, "\n$1\n\n")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
      .replace(/<[^>]+>/g, "");
  }

  return fountain.trim();
}

/**
 * Converts rich screenplay HTML into standard formatted plain text
 */
export function htmlToPlainText(html: string, project: Project): string {
  let text = `=================================================================\n${project.title.toUpperCase()}\nDraft Date: ${new Date().toLocaleDateString()}\n=================================================================\n\n`;

  if (typeof window !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const elements = doc.body.children;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const content = el.textContent?.trim() || "";
      const type = el.getAttribute("data-type") || el.tagName.toLowerCase();

      if (type === "scene-heading" || el.tagName === "H2") {
        text += `\n${content.toUpperCase()}\n\n`;
      } else if (type === "character") {
        text += `\n                                ${content.toUpperCase()}\n`;
      } else if (type === "parenthetical") {
        text += `                        ${content}\n`;
      } else if (type === "dialogue") {
        text += `                  ${content}\n\n`;
      } else if (type === "transition") {
        text += `\n                                                        ${content.toUpperCase()}\n\n`;
      } else if (type === "shot") {
        text += `\n${content.toUpperCase()}\n\n`;
      } else {
        text += `${content}\n\n`;
      }
    }
  } else {
    text += html.replace(/<[^>]+>/g, "\n");
  }

  return text.trim();
}

/**
 * Triggers file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Main export handler supporting PDF (print), Fountain, and Plain Text
 */
export function exportScreenplay(project: Project, options: ExportOptions) {
  const sanitizedTitle = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (options.format === "fountain") {
    const fountainContent = htmlToFountain(project.screenplayContent, project);
    downloadFile(fountainContent, `${sanitizedTitle}.fountain`, "text/plain;charset=utf-8");
  } else if (options.format === "txt") {
    const plainText = htmlToPlainText(project.screenplayContent, project);
    downloadFile(plainText, `${sanitizedTitle}.txt`, "text/plain;charset=utf-8");
  } else if (options.format === "pdf") {
    if (typeof window !== "undefined") {
      window.print();
    }
  }
}
