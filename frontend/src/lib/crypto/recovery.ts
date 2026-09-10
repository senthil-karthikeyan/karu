/**
 * Emergency Recovery Kit and Key Wrapping routines for Karu E2EE.
 *
 * In the target E2EE architecture:
 * - A random Emergency Recovery Code (e.g. KARU-XXXX-XXXX-XXXX-XXXX-XXXX) is generated client-side.
 * - An independent recovery salt is generated.
 * - PBKDF2(recovery_code, recovery_salt, 600k, SHA-256) derives a 256-bit Recovery Wrapping Key (AES-GCM).
 * - The user's ECDH P-256 private key (PKCS#8) is wrapped under the Recovery Wrapping Key.
 * - The raw recovery code is NEVER sent to the backend.
 * - Forgotten password recovery flow unwraps the private key with the recovery code, then
 *   re-wraps it with a new password-derived UEK.
 */

import {
  DEFAULT_PBKDF2_ITERATIONS,
  AES_KEY_LENGTH,
  SALT_LENGTH_BYTES,
  GCM_IV_LENGTH_BYTES,
  type KeyDerivationOptions,
} from "./crypto-types";
import {
  getSubtleCrypto,
  generateRandomBytes,
  stringToUtf8Bytes,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "./encoding";

/**
 * Generates a cryptographically random Emergency Recovery Code formatted with chunked blocks.
 * Example: KARU-7F3A-8C2D-E91B-4402-9B7C
 */
export function generateEmergencyRecoveryKey(): string {
  const bytes = generateRandomBytes(16);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");

  const chunks = [];
  for (let i = 0; i < hex.length; i += 4) {
    chunks.push(hex.slice(i, i + 4));
  }

  return `KARU-${chunks.join("-")}`;
}

/**
 * Normalizes a recovery code input by stripping extra spaces, making uppercase.
 */
export function normalizeRecoveryKey(rawKey: string): string {
  return rawKey.trim().toUpperCase();
}

/**
 * Validates the format of an Emergency Recovery Code (KARU-XXXX-XXXX-...).
 */
export function validateRecoveryKeyFormat(rawKey: string): boolean {
  if (!rawKey) return false;
  const normalized = normalizeRecoveryKey(rawKey);
  return /^KARU(-[0-9A-F]{4}){4,}$/.test(normalized);
}

/**
 * Derives a 256-bit AES-GCM Recovery Wrapping Key from the recovery code and recovery salt using PBKDF2.
 */
export async function deriveRecoveryWrappingKey(
  recoveryCode: string,
  salt: Uint8Array | string,
  options?: KeyDerivationOptions
): Promise<CryptoKey> {
  const normalized = normalizeRecoveryKey(recoveryCode);
  if (!normalized) {
    throw new Error("Recovery Code is required.");
  }

  const subtle = getSubtleCrypto();
  const rawSalt = typeof salt === "string" ? base64ToUint8Array(salt) : salt;

  if (!rawSalt || rawSalt.byteLength < 8) {
    throw new Error("Invalid recovery salt: salt must be at least 8 bytes.");
  }

  const iterations = options?.iterations ?? DEFAULT_PBKDF2_ITERATIONS;
  const hash = options?.hash ?? "SHA-256";
  const length = options?.length ?? AES_KEY_LENGTH;

  // Import normalized code as PBKDF2 secret
  const secretBytes = stringToUtf8Bytes(normalized);
  const baseKey = await subtle.importKey(
    "raw",
    secretBytes as unknown as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return subtle.deriveKey(
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
    false,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

/**
 * Wraps a user's ECDH P-256 private key (PKCS#8) under their derived Recovery Wrapping Key.
 */
export async function wrapPrivateKeyWithRecoveryKey(
  privateKey: CryptoKey,
  recoveryWrappingKey: CryptoKey
): Promise<{ wrappedPrivateKey: string; recoveryKeyIv: string }> {
  const subtle = getSubtleCrypto();
  const iv = generateRandomBytes(GCM_IV_LENGTH_BYTES);

  try {
    const wrappedBuffer = await subtle.wrapKey(
      "pkcs8",
      privateKey,
      recoveryWrappingKey,
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      }
    );

    return {
      wrappedPrivateKey: uint8ArrayToBase64(new Uint8Array(wrappedBuffer)),
      recoveryKeyIv: uint8ArrayToBase64(iv),
    };
  } catch (error) {
    throw new Error(
      `Failed to wrap private key with recovery key: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Unwraps a user's ECDH P-256 private key using their derived Recovery Wrapping Key.
 */
export async function unwrapPrivateKeyWithRecoveryKey(
  wrappedPrivateKeyBase64: string,
  ivBase64: string,
  recoveryWrappingKey: CryptoKey
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const iv = base64ToUint8Array(ivBase64);
  const wrappedBytes = base64ToUint8Array(wrappedPrivateKeyBase64);

  try {
    return await subtle.unwrapKey(
      "pkcs8",
      wrappedBytes as BufferSource,
      recoveryWrappingKey,
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );
  } catch (error) {
    throw new Error(
      `Failed to unwrap private key with recovery key: ${error instanceof Error ? error.message : "Invalid recovery code"}`
    );
  }
}

/**
 * Generates the plain text document for the downloaded Emergency Recovery Kit.
 */
export function generateRecoveryKitDocument(options: {
  email: string;
  recoveryKey: string;
  createdAt?: string;
}): string {
  const dateStr = options.createdAt || new Date().toUTCString();

  return `================================================================================
                         KARU ENCRYPTION RECOVERY CODE
================================================================================

Account Email : ${options.email}
Generated At  : ${dateStr}

--------------------------------------------------------------------------------
YOUR RECOVERY CODE:
--------------------------------------------------------------------------------

  ${options.recoveryKey}

--------------------------------------------------------------------------------
IMPORTANT INSTRUCTIONS:
--------------------------------------------------------------------------------
1. Karu protects your screenplays with encryption.
   Karu employees and servers DO NOT hold your encryption passphrase.

2. If you forget your encryption passphrase, this Recovery Code is your safeguard
   to regain access to your protected screenplays.

3. Store this file securely:
   - Keep a copy in a safe place.
   - Or store in a password manager.
   - Never share this recovery code with anyone.

================================================================================
`;
}

/**
 * Initiates a client-side text file download of the Recovery Kit.
 */
export function downloadRecoveryKit(
  recoveryKey: string,
  email: string
): void {
  if (typeof window === "undefined") return;

  const doc = generateRecoveryKitDocument({ email, recoveryKey });
  const blob = new Blob([doc], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `karu-recovery-kit-${email.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
