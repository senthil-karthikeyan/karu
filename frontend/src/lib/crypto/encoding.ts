/**
 * Binary encoding, Base64 conversion, and Web Crypto environment utilities.
 */

/**
 * Checks if the Web Crypto API is available in the current environment.
 */
export function isWebCryptoAvailable(): boolean {
  return typeof globalThis !== "undefined" && !!globalThis.crypto?.subtle;
}

/**
 * Returns the Web Crypto subtle interface or throws a descriptive error.
 */
export function getSubtleCrypto(): SubtleCrypto {
  if (!isWebCryptoAvailable()) {
    throw new Error(
      "Web Crypto API (crypto.subtle) is not available in the current environment. Crypto operations must execute in a secure browser context."
    );
  }
  return globalThis.crypto.subtle;
}

/**
 * Generates cryptographically secure random bytes.
 */
export function generateRandomBytes(length: number): Uint8Array {
  if (typeof globalThis === "undefined" || !globalThis.crypto?.getRandomValues) {
    throw new Error("crypto.getRandomValues is not available in this environment.");
  }
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Encodes a Uint8Array into a Base64 string safely without stack overflow on large buffers.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Use chunked processing to avoid stack overflow with String.fromCharCode
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  const chunks: string[] = [];
  
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }
  
  const binaryString = chunks.join("");
  
  if (typeof btoa === "function") {
    return btoa(binaryString);
  }
  
  // Fallback for Node.js test environments
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  
  throw new Error("No Base64 encoder available.");
}

/**
 * Decodes a Base64 string into a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  if (!base64 || typeof base64 !== "string") {
    throw new Error("Invalid Base64 input: string expected.");
  }

  // Remove whitespace
  const sanitized = base64.trim();

  if (typeof atob === "function") {
    const binaryString = atob(sanitized);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Fallback for Node.js test environments
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(sanitized, "base64"));
  }

  throw new Error("No Base64 decoder available.");
}

/**
 * Converts a UTF-8 string to a Uint8Array.
 */
export function stringToUtf8Bytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array or ArrayBuffer to a UTF-8 string.
 */
export function utf8BytesToString(buffer: Uint8Array | ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}
