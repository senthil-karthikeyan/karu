/**
 * PBKDF2 Key Derivation Module for User Encryption Key (UEK).
 */

import {
  DEFAULT_PBKDF2_ITERATIONS,
  AES_KEY_LENGTH,
  SALT_LENGTH_BYTES,
  type KeyDerivationOptions,
} from "./crypto-types";
import {
  getSubtleCrypto,
  generateRandomBytes,
  stringToUtf8Bytes,
  base64ToUint8Array,
} from "./encoding";

/**
 * Generates a random cryptographic salt for PBKDF2 key derivation.
 */
export function generateSalt(length = SALT_LENGTH_BYTES): Uint8Array {
  return generateRandomBytes(length);
}

/**
 * Derives a 256-bit AES-GCM User Encryption Key (UEK) from a secret password and salt using PBKDF2.
 *
 * @param secret - The user's master encryption password / passphrase.
 * @param salt - A random 16-byte salt as Uint8Array or Base64 string.
 * @param options - PBKDF2 configuration (defaults: SHA-256, 600,000 iterations, 256 bits).
 */
export async function deriveUserEncryptionKey(
  secret: string,
  salt: Uint8Array | string,
  options?: KeyDerivationOptions
): Promise<CryptoKey> {
  if (!secret || typeof secret !== "string") {
    throw new Error("Encryption secret is required for key derivation.");
  }

  const subtle = getSubtleCrypto();
  const rawSalt = typeof salt === "string" ? base64ToUint8Array(salt) : salt;

  if (!rawSalt || rawSalt.byteLength < 8) {
    throw new Error("Invalid salt: salt must be at least 8 bytes.");
  }

  const iterations = options?.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const hash = options?.hash ?? "SHA-256";
  const length = options?.length ?? AES_KEY_LENGTH;

  // 1. Import raw secret bytes into PBKDF2 base key (non-extractable)
  const secretBytes = stringToUtf8Bytes(secret);
  const baseKey = await subtle.importKey(
    "raw",
    secretBytes as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // 2. Derive AES-GCM key with wrapKey/unwrapKey/encrypt/decrypt capabilities
  const derivedKey = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: rawSalt as unknown as BufferSource,
      iterations,
      hash,
    },
    baseKey,
    {
      name: "AES-GCM",
      length,
    },
    false, // UEK is non-extractable from browser memory
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );

  return derivedKey;
}
