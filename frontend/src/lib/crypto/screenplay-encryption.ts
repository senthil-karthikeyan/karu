/**
 * High-level Screenplay Document Encryption and Decryption module for TipTap JSON.
 */

import {
  CURRENT_ENCRYPTION_VERSION,
  CURRENT_ALGORITHM,
  type EncryptedPayload,
  type TipTapDocumentJSON,
} from "./crypto-types";
import {
  stringToUtf8Bytes,
  utf8BytesToString,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "./encoding";
import { encryptAESGCM, decryptAESGCM } from "./aes-gcm";

/**
 * Type guard to check if an unknown object matches the EncryptedPayload schema.
 */
export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === CURRENT_ENCRYPTION_VERSION &&
    candidate.algorithm === CURRENT_ALGORITHM &&
    typeof candidate.iv === "string" &&
    candidate.iv.length > 0 &&
    typeof candidate.ciphertext === "string" &&
    candidate.ciphertext.length > 0
  );
}

/**
 * Attempts to parse a raw string as an EncryptedPayload.
 * Returns null if the string is not valid JSON or does not match EncryptedPayload.
 */
export function parseEncryptedPayloadString(raw: string): EncryptedPayload | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (isEncryptedPayload(parsed)) {
      return parsed;
    }
  } catch {
    // Not JSON
  }
  return null;
}

/**
 * Encrypts a structured TipTap document JSON object with the Screenplay Content Key.
 *
 * @param doc - The TipTap document JSON representation.
 * @param key - The Screenplay Content Key (SCK).
 * @returns EncryptedPayload with Base64 IV and Ciphertext.
 */
export async function encryptScreenplayContent(
  doc: TipTapDocumentJSON,
  key: CryptoKey
): Promise<EncryptedPayload> {
  if (!doc || typeof doc !== "object" || doc.type !== "doc") {
    throw new Error("Invalid TipTap document structure: 'doc' type expected.");
  }
  if (!key) {
    throw new Error("Screenplay Content Key is required for encryption.");
  }

  // 1. Serialize TipTap JSON to UTF-8 bytes
  const jsonString = JSON.stringify(doc);
  const plaintextBytes = stringToUtf8Bytes(jsonString);

  // 2. Encrypt with AES-GCM (auto-generates fresh 12-byte IV)
  const { iv, ciphertext } = await encryptAESGCM(key, plaintextBytes);

  // 3. Return versioned Base64 payload
  return {
    version: CURRENT_ENCRYPTION_VERSION,
    algorithm: CURRENT_ALGORITHM,
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(ciphertext),
  };
}

/**
 * Decrypts an EncryptedPayload into a structured TipTap document JSON object.
 *
 * @param payload - The EncryptedPayload containing Base64 IV and ciphertext.
 * @param key - The Screenplay Content Key (SCK).
 * @returns The decrypted TipTap document JSON object.
 */
export async function decryptScreenplayContent(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<TipTapDocumentJSON> {
  if (!isEncryptedPayload(payload)) {
    throw new Error("Invalid encrypted payload format.");
  }
  if (payload.version !== CURRENT_ENCRYPTION_VERSION) {
    throw new Error(
      `Unsupported encryption version: ${payload.version}. Expected version ${CURRENT_ENCRYPTION_VERSION}.`
    );
  }
  if (payload.algorithm !== CURRENT_ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${payload.algorithm}. Expected ${CURRENT_ALGORITHM}.`);
  }
  if (!key) {
    throw new Error("Screenplay Content Key is required for decryption.");
  }

  // 1. Decode Base64 IV and Ciphertext
  const iv = base64ToUint8Array(payload.iv);
  const ciphertext = base64ToUint8Array(payload.ciphertext);

  // 2. Decrypt AES-GCM
  const decryptedBytes = await decryptAESGCM(key, iv, ciphertext);

  // 3. Decode UTF-8 string and parse TipTap JSON
  const jsonString = utf8BytesToString(decryptedBytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Decrypted content is not valid JSON: ${err instanceof Error ? err.message : "Parse error"}`);
  }

  if (!parsed || typeof parsed !== "object" || (parsed as Record<string, unknown>).type !== "doc") {
    throw new Error("Decrypted JSON is not a valid TipTap document.");
  }

  return parsed as TipTapDocumentJSON;
}

/**
 * Converts a TipTap document JSON structure back into screenplay HTML.
 */
export function tipTapJsonToHtml(doc: TipTapDocumentJSON): string {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return "";
  }

  return doc.content
    .map((node) => {
      const text = (node.content || [])
        .map((c) => c.text || "")
        .join("");

      const nodeType = node.type;
      const dataType =
        (node.attrs?.dataType as string) ||
        (node.attrs?.["data-type"] as string) ||
        (nodeType === "sceneHeading" ? "scene-heading" : nodeType);

      if (nodeType === "sceneHeading" || nodeType === "heading" || dataType === "scene-heading") {
        return `<h2 data-type="scene-heading">${text}</h2>`;
      }
      if (nodeType === "character" || dataType === "character") {
        return `<p data-type="character">${text}</p>`;
      }
      if (nodeType === "dialogue" || dataType === "dialogue") {
        return `<p data-type="dialogue">${text}</p>`;
      }
      if (nodeType === "parenthetical" || dataType === "parenthetical") {
        return `<p data-type="parenthetical">${text}</p>`;
      }
      if (nodeType === "transition" || dataType === "transition") {
        return `<p data-type="transition">${text}</p>`;
      }
      if (nodeType === "shot" || dataType === "shot") {
        return `<p data-type="shot">${text}</p>`;
      }
      return `<p data-type="action">${text}</p>`;
    })
    .join("\n");
}

/**
 * Converts a screenplay HTML string into a structured TipTap document JSON object.
 */
export function htmlToTipTapJson(html: string): TipTapDocumentJSON {
  if (typeof window === "undefined" || !html || !html.trim()) {
    return {
      type: "doc",
      content: [
        {
          type: "action",
          attrs: { dataType: "action" },
          content: [{ type: "text", text: "" }],
        },
      ],
    };
  }

  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(html, "text/html");
  const children = Array.from(parsedDoc.body.children);

  if (children.length === 0) {
    return {
      type: "doc",
      content: [
        {
          type: "action",
          attrs: { dataType: "action" },
          content: [{ type: "text", text: html }],
        },
      ],
    };
  }

  const nodes = children.map((el) => {
    const text = el.textContent || "";
    const dataType =
      el.getAttribute("data-type") ||
      (el.tagName === "H2" || el.tagName === "H1" || el.tagName === "H3" ? "scene-heading" : "action");

    let nodeType = "action";
    if (dataType === "scene-heading" || el.tagName === "H2") {
      nodeType = "sceneHeading";
    } else if (dataType === "character") {
      nodeType = "character";
    } else if (dataType === "dialogue") {
      nodeType = "dialogue";
    } else if (dataType === "parenthetical") {
      nodeType = "parenthetical";
    } else if (dataType === "transition") {
      nodeType = "transition";
    } else if (dataType === "shot") {
      nodeType = "shot";
    }

    return {
      type: nodeType,
      attrs: { dataType },
      content: text ? [{ type: "text", text }] : [],
    };
  });

  return {
    type: "doc",
    content:
      nodes.length > 0 ? nodes : [{ type: "action", attrs: { dataType: "action" }, content: [] }],
  };
}

/**
 * Normalizes legacy TipTap JSON AST into semantic screenplay nodes
 */
export function normalizeScreenplayDoc(doc: TipTapDocumentJSON): TipTapDocumentJSON {
  if (!doc || !doc.content || !Array.isArray(doc.content)) {
    return {
      type: "doc",
      content: [{ type: "action", attrs: { dataType: "action" }, content: [{ type: "text", text: "" }] }],
    };
  }

  const normalizedContent = doc.content.map((node) => {
    let typeName = node.type;
    const dataType =
      (node.attrs?.dataType as string) ||
      (node.attrs?.["data-type"] as string) ||
      "";

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
