/**
 * ECIES (Elliptic Curve Integrated Encryption Scheme) Implementation for Karu E2EE.
 *
 * Uses ECDH over NIST P-256 (secp256r1) for key agreement, and AES-256-GCM
 * with a 12-byte IV for authenticated symmetric key wrapping.
 *
 * Flow:
 * 1. Sharer generates fresh ephemeral ECDH P-256 key pair.
 * 2. Sharer derives shared secret with recipient's public key (ECDH).
 * 3. Sharer derives 256-bit AES-GCM wrapping key from shared secret.
 * 4. Sharer encrypts/wraps the SCK using AES-GCM.
 * 5. Recipient reconstructs shared secret using own private key and the ephemeral public key.
 * 6. Recipient un緻wraps the SCK.
 */

import {
  CURRENT_ENCRYPTION_VERSION,
  ECIES_ALGORITHM,
  GCM_IV_LENGTH_BYTES,
  type ECIESWrappedKeyPayload,
} from "./crypto-types";
import {
  getSubtleCrypto,
  generateRandomBytes,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "./encoding";

/**
 * Wraps a Screenplay Content Key (SCK) for a recipient using ECIES P-256 + AES-GCM.
 *
 * @param recipientPublicKeyBase64 Recipient's SPKI public key encoded in Base64
 * @param keyToWrap The SCK CryptoKey to wrap
 * @returns ECIESWrappedKeyPayload containing ephemeral public key, IV, and wrapped ciphertext
 */
export async function wrapKeyWithECIES(
  recipientPublicKeyBase64: string,
  keyToWrap: CryptoKey
): Promise<ECIESWrappedKeyPayload> {
  if (!recipientPublicKeyBase64) {
    throw new Error("Recipient public key is required for ECIES key wrapping.");
  }
  if (!keyToWrap) {
    throw new Error("Key to wrap is required.");
  }

  const subtle = getSubtleCrypto();

  try {
    // 1. Import recipient's public key (ECDH P-256)
    const recipientPubKeyBytes = base64ToUint8Array(recipientPublicKeyBase64);
    const recipientPubKey = await subtle.importKey(
      "spki",
      recipientPubKeyBytes as BufferSource,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      false,
      []
    );

    // 2. Generate ephemeral key pair
    const ephemeralKeyPair = await subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true, // extractable so we can export ephemeral public key
      ["deriveKey", "deriveBits"]
    );

    // 3. Export ephemeral public key as Base64 SPKI
    const ephemeralPubKeyBuffer = await subtle.exportKey(
      "spki",
      ephemeralKeyPair.publicKey
    );
    const ephemeralPublicKeyBase64 = uint8ArrayToBase64(
      new Uint8Array(ephemeralPubKeyBuffer)
    );

    // 4. Derive AES-GCM wrapping key via ECDH
    const wrappingKey = await subtle.deriveKey(
      {
        name: "ECDH",
        public: recipientPubKey,
      },
      ephemeralKeyPair.privateKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["wrapKey", "encrypt"]
    );

    // 5. Wrap the SCK with AES-GCM and 12-byte random IV
    const iv = generateRandomBytes(GCM_IV_LENGTH_BYTES);
    const wrappedBuffer = await subtle.wrapKey(
      "raw",
      keyToWrap,
      wrappingKey,
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      }
    );

    return {
      version: CURRENT_ENCRYPTION_VERSION,
      algorithm: ECIES_ALGORITHM,
      ephemeralPublicKey: ephemeralPublicKeyBase64,
      iv: uint8ArrayToBase64(iv),
      wrappedKey: uint8ArrayToBase64(new Uint8Array(wrappedBuffer)),
    };
  } catch (error) {
    throw new Error(
      `ECIES wrapping failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Unwraps an ECIES-wrapped Screenplay Content Key using the user's private key.
 *
 * @param userPrivateKey User's ECDH P-256 private key
 * @param wrappedPayload The ECIES payload containing ephemeral public key, IV, and ciphertext
 * @returns Unwrapped SCK CryptoKey
 */
export async function unwrapKeyWithECIES(
  userPrivateKey: CryptoKey,
  wrappedPayload: {
    ephemeralPublicKey?: string;
    iv: string;
    wrappedKey: string;
    version?: number;
    algorithm?: string;
  }
): Promise<CryptoKey> {
  if (!userPrivateKey) {
    throw new Error("User private key is required to unwrap ECIES key.");
  }
  if (!wrappedPayload.ephemeralPublicKey) {
    throw new Error("Ephemeral public key is missing from ECIES payload.");
  }
  if (!wrappedPayload.iv || !wrappedPayload.wrappedKey) {
    throw new Error("Invalid ECIES wrapped key payload: missing IV or wrapped key.");
  }

  const subtle = getSubtleCrypto();

  try {
    // 1. Import sender's ephemeral public key
    const ephemeralPubKeyBytes = base64ToUint8Array(wrappedPayload.ephemeralPublicKey);
    const ephemeralPubKey = await subtle.importKey(
      "spki",
      ephemeralPubKeyBytes as BufferSource,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      false,
      []
    );

    // 2. Derive AES-GCM unwrapping key using user's private key + sender's ephemeral public key
    const unwrappingKey = await subtle.deriveKey(
      {
        name: "ECDH",
        public: ephemeralPubKey,
      },
      userPrivateKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["unwrapKey", "decrypt"]
    );

    // 3. Unwrap the SCK
    const iv = base64ToUint8Array(wrappedPayload.iv);
    const wrappedKeyBytes = base64ToUint8Array(wrappedPayload.wrappedKey);

    return await subtle.unwrapKey(
      "raw",
      wrappedKeyBytes as BufferSource,
      unwrappingKey,
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      {
        name: "AES-GCM",
        length: 256,
      },
      true, // extractable for local in-memory operations
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    throw new Error(
      `ECIES unwrapping failed: ${error instanceof Error ? error.message : "Decryption failed or invalid key"}`
    );
  }
}

/**
 * Wraps raw key bytes using ECIES P-256 + AES-GCM.
 */
export async function wrapRawBytesWithECIES(
  recipientPublicKeyBase64: string,
  rawBytes: Uint8Array
): Promise<ECIESWrappedKeyPayload> {
  const subtle = getSubtleCrypto();
  const rawKey = await subtle.importKey(
    "raw",
    rawBytes as BufferSource,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return wrapKeyWithECIES(recipientPublicKeyBase64, rawKey);
}

/**
 * Unwraps an ECIES payload directly to raw key bytes.
 */
export async function unwrapRawBytesWithECIES(
  userPrivateKey: CryptoKey,
  wrappedPayload: {
    ephemeralPublicKey?: string;
    iv: string;
    wrappedKey: string;
  }
): Promise<Uint8Array> {
  const key = await unwrapKeyWithECIES(userPrivateKey, wrappedPayload);
  const subtle = getSubtleCrypto();
  const raw = await subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}
