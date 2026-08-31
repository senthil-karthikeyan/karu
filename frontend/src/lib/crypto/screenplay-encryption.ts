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
