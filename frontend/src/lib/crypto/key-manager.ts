/**
 * Key Management and Key Wrapping routines for Karu E2EE.
 *
 * Implements the 3-tier key hierarchy:
 * 1. UEK (User Encryption Key) -> Wraps PEK (Project Encryption Key) & User Identity Private Key
 * 2. PEK (Project Encryption Key) -> Wraps SCK (Screenplay Content Key)
 * 3. SCK (Screenplay Content Key) -> Encrypts TipTap Screenplay Content
 */

import {
  CURRENT_ENCRYPTION_VERSION,
  CURRENT_ALGORITHM,
  ASYMMETRIC_ALGORITHM,
  AES_KEY_LENGTH,
  GCM_IV_LENGTH_BYTES,
  type WrappedKeyPayload,
  type UserIdentityKeyPair,
  type UserIdentityPublicExport,
} from "./crypto-types";
import {
  getSubtleCrypto,
  generateRandomBytes,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "./encoding";

// =============================================================================
// 1. PROJECT ENCRYPTION KEY (PEK) MANAGEMENT
// =============================================================================

/**
 * Generates an independent random 256-bit AES-GCM Project Encryption Key (PEK).
 */
export async function generateProjectEncryptionKey(): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.generateKey(
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH,
    },
    true, // Extractable so it can be wrapped per project member
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
}

/**
 * Wraps a Project Encryption Key (PEK) with a User Encryption Key (UEK).
 */
export async function wrapProjectKeyWithUEK(
  uek: CryptoKey,
  pek: CryptoKey
): Promise<WrappedKeyPayload> {
  if (!uek) {
    throw new Error("User Encryption Key (UEK) is required to wrap Project Key.");
  }
  if (!pek) {
    throw new Error("Project Encryption Key (PEK) is required to wrap.");
  }

  const subtle = getSubtleCrypto();
  const iv = generateRandomBytes(GCM_IV_LENGTH_BYTES);

  try {
    const wrappedBuffer = await subtle.wrapKey(
      "raw",
      pek,
      uek,
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      }
    );

    return {
      version: CURRENT_ENCRYPTION_VERSION,
      algorithm: CURRENT_ALGORITHM,
      iv: uint8ArrayToBase64(iv),
      wrappedKey: uint8ArrayToBase64(new Uint8Array(wrappedBuffer)),
    };
  } catch (error) {
    throw new Error(
      `Failed to wrap Project Key with UEK: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Unwraps a Project Encryption Key (PEK) using a User Encryption Key (UEK).
 */
export async function unwrapProjectKeyWithUEK(
  uek: CryptoKey,
  wrapped: WrappedKeyPayload
): Promise<CryptoKey> {
  if (!uek) {
    throw new Error("User Encryption Key (UEK) is required to unwrap Project Key.");
  }
  if (!wrapped || !wrapped.iv || !wrapped.wrappedKey) {
    throw new Error("Invalid wrapped key payload: missing IV or wrapped key data.");
  }

  const subtle = getSubtleCrypto();
  const iv = base64ToUint8Array(wrapped.iv);
  const wrappedKeyBytes = base64ToUint8Array(wrapped.wrappedKey);

  try {
    return await subtle.unwrapKey(
      "raw",
      wrappedKeyBytes as BufferSource,
      uek,
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      {
        name: "AES-GCM",
        length: 256,
      },
      true, // Extractable so PEK can wrap SCKs and be shared
      ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
  } catch (error) {
    throw new Error(
      `Failed to unwrap Project Key: ${error instanceof Error ? error.message : "Invalid key or passphrase"}`
    );
  }
}

// =============================================================================
// 2. SCREENPLAY CONTENT KEY (SCK) MANAGEMENT
// =============================================================================

/**
 * Wraps a Screenplay Content Key (SCK) with a Project Encryption Key (PEK).
 */
export async function wrapScreenplayKeyWithPEK(
  pek: CryptoKey,
  sck: CryptoKey
): Promise<WrappedKeyPayload> {
  if (!pek) {
    throw new Error("Project Encryption Key (PEK) is required to wrap Screenplay Key.");
  }
  if (!sck) {
    throw new Error("Screenplay Content Key (SCK) is required to wrap.");
  }

  const subtle = getSubtleCrypto();
  const iv = generateRandomBytes(GCM_IV_LENGTH_BYTES);

  try {
    const wrappedBuffer = await subtle.wrapKey(
      "raw",
      sck,
      pek,
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      }
    );

    return {
      version: CURRENT_ENCRYPTION_VERSION,
      algorithm: CURRENT_ALGORITHM,
      iv: uint8ArrayToBase64(iv),
      wrappedKey: uint8ArrayToBase64(new Uint8Array(wrappedBuffer)),
    };
  } catch (error) {
    throw new Error(
      `Failed to wrap Screenplay Key with PEK: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Unwraps a Screenplay Content Key (SCK) using a Project Encryption Key (PEK).
 */
export async function unwrapScreenplayKeyWithPEK(
  pek: CryptoKey,
  wrapped: WrappedKeyPayload
): Promise<CryptoKey> {
  if (!pek) {
    throw new Error("Project Encryption Key (PEK) is required to unwrap Screenplay Key.");
  }
  if (!wrapped || !wrapped.iv || !wrapped.wrappedKey) {
    throw new Error("Invalid wrapped key payload: missing IV or wrapped key data.");
  }

  const subtle = getSubtleCrypto();
  const iv = base64ToUint8Array(wrapped.iv);
  const wrappedKeyBytes = base64ToUint8Array(wrapped.wrappedKey);

  try {
    return await subtle.unwrapKey(
      "raw",
      wrappedKeyBytes as BufferSource,
      pek,
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      {
        name: "AES-GCM",
        length: 256,
      },
      true, // Extractable for future re-wrapping / versioning
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    throw new Error(
      `Failed to unwrap Screenplay Key with PEK: ${error instanceof Error ? error.message : "Invalid key or secret"}`
    );
  }
}

/**
 * Direct 2-tier wrapping: Wraps SCK directly with the User Encryption Key (UEK).
 */
export async function wrapScreenplayContentKeyWithUEK(
  uek: CryptoKey,
  sck: CryptoKey
): Promise<WrappedKeyPayload> {
  return wrapProjectKeyWithUEK(uek, sck);
}

/**
 * Direct 2-tier unwrapping: Unwraps SCK directly using the User Encryption Key (UEK).
 */
export async function unwrapScreenplayContentKeyWithUEK(
  uek: CryptoKey,
  wrapped: WrappedKeyPayload
): Promise<CryptoKey> {
  return unwrapProjectKeyWithUEK(uek, wrapped);
}

/**
 * Backward-compatible helper: Wraps SCK with UEK directly.
 */
export async function wrapScreenplayContentKey(
  uek: CryptoKey,
  sck: CryptoKey
): Promise<WrappedKeyPayload> {
  return wrapScreenplayContentKeyWithUEK(uek, sck);
}

/**
 * Backward-compatible helper: Unwraps SCK with UEK directly.
 */
export async function unwrapScreenplayContentKey(
  uek: CryptoKey,
  wrapped: WrappedKeyPayload
): Promise<CryptoKey> {
  return unwrapScreenplayContentKeyWithUEK(uek, wrapped);
}

// =============================================================================
// 3. USER ENCRYPTION IDENTITY (ASYMMETRIC ECDH P-256) FOUNDATION
// =============================================================================

/**
 * Generates an asymmetric ECDH P-256 keypair for a user's encryption identity.
 */
export async function generateUserIdentityKeyPair(): Promise<UserIdentityKeyPair> {
  const subtle = getSubtleCrypto();
  const keyPair = await subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // Extractable so public key can be exported and private key wrapped
    ["deriveKey", "deriveBits"]
  );

  return keyPair as UserIdentityKeyPair;
}

/**
 * Exports a User Identity Public Key as a Base64 encoded SPKI string.
 */
export async function exportUserIdentityPublicKey(
  publicKey: CryptoKey
): Promise<UserIdentityPublicExport> {
  const subtle = getSubtleCrypto();
  const spkiBuffer = await subtle.exportKey("spki", publicKey);
  return {
    version: CURRENT_ENCRYPTION_VERSION,
    algorithm: ASYMMETRIC_ALGORITHM,
    publicKey: uint8ArrayToBase64(new Uint8Array(spkiBuffer)),
  };
}

/**
 * Wraps a User Identity Private Key (PKCS#8) with the user's UEK (AES-GCM).
 */
export async function wrapUserPrivateKeyWithUEK(
  uek: CryptoKey,
  privateKey: CryptoKey
): Promise<WrappedKeyPayload> {
  const subtle = getSubtleCrypto();
  const iv = generateRandomBytes(GCM_IV_LENGTH_BYTES);

  try {
    const wrappedBuffer = await subtle.wrapKey(
      "pkcs8",
      privateKey,
      uek,
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      }
    );

    return {
      version: CURRENT_ENCRYPTION_VERSION,
      algorithm: CURRENT_ALGORITHM,
      iv: uint8ArrayToBase64(iv),
      wrappedKey: uint8ArrayToBase64(new Uint8Array(wrappedBuffer)),
    };
  } catch (error) {
    throw new Error(
      `Failed to wrap User Private Key with UEK: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Unwraps a User Identity Private Key using the user's UEK.
 */
export async function unwrapUserPrivateKeyWithUEK(
  uek: CryptoKey,
  wrapped: WrappedKeyPayload
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const iv = base64ToUint8Array(wrapped.iv);
  const wrappedBytes = base64ToUint8Array(wrapped.wrappedKey);

  try {
    return await subtle.unwrapKey(
      "pkcs8",
      wrappedBytes as BufferSource,
      uek,
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
      `Failed to unwrap User Private Key: ${error instanceof Error ? error.message : "Invalid key or passphrase"}`
    );
  }
}

// =============================================================================
// 4. RAW KEY EXPORT / IMPORT HELPERS
// =============================================================================

/**
 * Exports a CryptoKey to raw binary bytes.
 */
export async function exportKeyRaw(key: CryptoKey): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const rawBuffer = await subtle.exportKey("raw", key);
  return new Uint8Array(rawBuffer);
}

/**
 * Imports raw binary bytes into an AES-GCM CryptoKey.
 */
export async function importKeyRaw(
  rawBytes: Uint8Array,
  extractable = true
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.importKey(
    "raw",
    rawBytes as BufferSource,
    {
      name: "AES-GCM",
      length: 256,
    },
    extractable,
    ["encrypt", "decrypt"]
  );
}
