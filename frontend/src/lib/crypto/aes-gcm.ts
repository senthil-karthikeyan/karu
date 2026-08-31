/**
 * Core AES-GCM (256-bit) encryption and decryption routines.
 */

import { AES_KEY_LENGTH, GCM_IV_LENGTH_BYTES } from "./crypto-types";
import { getSubtleCrypto, generateRandomBytes } from "./encoding";

/**
 * Generates an independent random 256-bit AES-GCM Screenplay Content Key (SCK).
 */
export async function generateScreenplayContentKey(): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.generateKey(
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    true, // Extractable so it can be wrapped by the UEK
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a binary buffer using AES-GCM with a fresh, random 12-byte IV.
 *
 * @param key - The AES-GCM CryptoKey.
 * @param plaintext - The binary payload to encrypt.
 * @returns Object containing the 12-byte random IV and the encrypted ciphertext with auth tag.
 */
export async function encryptAESGCM(
  key: CryptoKey,
  plaintext: Uint8Array
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  if (!key) {
    throw new Error("CryptoKey is required for encryption.");
  }
  if (!plaintext) {
    throw new Error("Plaintext data is required for encryption.");
  }

  const subtle = getSubtleCrypto();
  
  // Mandatory: Generate a fresh 12-byte IV for EVERY encryption operation
  const iv = generateRandomBytes(GCM_IV_LENGTH_BYTES);

  try {
    const encryptedBuffer = await subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      key,
      plaintext as BufferSource
    );

    return {
      iv,
      ciphertext: new Uint8Array(encryptedBuffer),
    };
  } catch (error) {
    throw new Error(
      `AES-GCM encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypts a binary AES-GCM ciphertext using the given key and IV.
 *
 * @param key - The AES-GCM CryptoKey.
 * @param iv - The 12-byte IV used during encryption.
 * @param ciphertext - The encrypted ciphertext with auth tag.
 * @returns The decrypted plaintext bytes.
 */
export async function decryptAESGCM(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  if (!key) {
    throw new Error("CryptoKey is required for decryption.");
  }
  if (!iv || iv.byteLength !== GCM_IV_LENGTH_BYTES) {
    throw new Error(`Invalid IV: expected ${GCM_IV_LENGTH_BYTES} bytes.`);
  }
  if (!ciphertext || ciphertext.byteLength === 0) {
    throw new Error("Invalid ciphertext: non-empty buffer expected.");
  }

  const subtle = getSubtleCrypto();

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      key,
      ciphertext as BufferSource
    );

    return new Uint8Array(decryptedBuffer);
  } catch (error) {
    throw new Error(
      `AES-GCM decryption failed (content may be corrupted or encryption key is incorrect): ${
        error instanceof Error ? error.message : "Authentication tag verification failed"
      }`
    );
  }
}
