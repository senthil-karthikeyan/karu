import type { ExportOptions, Project } from "@/types/screenplay";

/**
 * Splits screenplay HTML content into individual physical page HTML segments
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

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const text = el.textContent || "";
    const type = el.getAttribute("data-type") || el.tagName.toLowerCase();
    const len = text.length;

    let height = 24;
    if (type === "scene-heading" || el.tagName === "H2") {
      height = 68;
    } else if (type === "character") {
      height = 42;
    } else if (type === "parenthetical") {
      height = 22;
    } else if (type === "dialogue") {
      const lines = Math.max(1, Math.ceil(len / 45));
      height = lines * 21 + 14;
    } else if (type === "transition") {
      height = 60;
    } else if (type === "shot") {
      height = 56;
    } else {
      const lines = Math.max(1, Math.ceil(len / 72));
      height = lines * 21 + 14;
    }

    if (currentHeight + height > pageUsableHeight && currentPageElements.length > 0) {
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
 * Converts rich screenplay HTML into plain Fountain format
 */
export function htmlToFountain(html: string, project: Project): string {
  let fountain = `Title: ${project.title}\nCredit: Written by\nAuthor: Arjun Dev\nDraft date: ${new Date().toLocaleDateString()}\n\n`;

  // Parse HTML
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
        // Action / general paragraph
        fountain += `${text}\n\n`;
      }
    }
  } else {
    // Fallback regex converter
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
 * Converts rich screenplay HTML into plain text format
 */
export function htmlToPlainText(html: string, project: Project): string {
  let text = `=================================================================\n${project.title.toUpperCase()}\nWritten by Arjun Dev\nDraft Date: ${new Date().toLocaleDateString()}\n=================================================================\n\n`;

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
    // For PDF in client-side MVP, trigger window.print with screenplay layout or create downloadable formatted HTML document
    if (typeof window !== "undefined") {
      window.print();
    }
  }
}
