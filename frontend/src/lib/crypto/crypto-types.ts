/**
 * Core cryptographic types and data models for Karu E2EE.
 *
 * KEY HIERARCHY:
 * 1. User Encryption Key (UEK): Derived via PBKDF2-SHA256 from user's secret passphrase + salt.
 * 2. User Encryption Identity (UEI): Asymmetric ECDH P-256 keypair (Public Key stored on backend; Private Key wrapped by UEK).
 * 3. Project Encryption Key (PEK): Random 256-bit AES-GCM key wrapped by member's UEK (or shared key).
 * 4. Screenplay Content Key (SCK): Random 256-bit AES-GCM key wrapped by the PEK.
 * 5. Screenplay Content: Serialized TipTap JSON encrypted with SCK using AES-256-GCM with fresh 12-byte random IV.
 */

export const CURRENT_ENCRYPTION_VERSION = 1 as const;
export const CURRENT_ALGORITHM = "AES-GCM" as const;
export const ASYMMETRIC_ALGORITHM = "ECDH-P256" as const;
export const DEFAULT_PBKDF2_ITERATIONS = 600000;
export const AES_KEY_LENGTH = 256;
export const GCM_IV_LENGTH_BYTES = 12; // 96 bits
export const SALT_LENGTH_BYTES = 16; // 128 bits

/**
 * Standard encrypted payload stored in database or transferred over API.
 */
export interface EncryptedPayload {
  version: typeof CURRENT_ENCRYPTION_VERSION;
  algorithm: typeof CURRENT_ALGORITHM;
  iv: string; // Base64 encoded 12-byte IV
  ciphertext: string; // Base64 encoded ciphertext with authentication tag
}

/**
 * Generic wrapped key payload (Base64 IV + Base64 ciphertext).
 */
export interface WrappedKeyPayload {
  version: typeof CURRENT_ENCRYPTION_VERSION;
  algorithm: typeof CURRENT_ALGORITHM;
  iv: string; // Base64 encoded 12-byte IV used for wrapping
  wrappedKey: string; // Base64 encoded encrypted raw key bytes
}

/**
 * Screenplay Content Key (SCK) wrapped by a User Encryption Key (UEK).
 */
export interface WrappedScreenplayKeyPayload extends WrappedKeyPayload {
  screenplayId: string;
}

/**
 * User Encryption Identity Keypair (ECDH P-256).
 */
export interface UserIdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Exported public representation of a User Encryption Identity.
 */
export interface UserIdentityPublicExport {
  version: typeof CURRENT_ENCRYPTION_VERSION;
  algorithm: typeof ASYMMETRIC_ALGORITHM;
  publicKey: string; // Base64 encoded SPKI public key bytes
}

/**
 * User Private Key wrapped by the user's UEK for secure backend storage.
 */
export interface WrappedUserPrivateKeyPayload extends WrappedKeyPayload {
  publicKey: string; // Base64 encoded SPKI public key
  identityAlgorithm: typeof ASYMMETRIC_ALGORITHM;
}

/**
 * Metadata required to derive a user's UEK from their encryption secret.
 */
export interface UserEncryptionMetadata {
  version: typeof CURRENT_ENCRYPTION_VERSION;
  salt: string; // Base64 encoded random salt
  iterations: number; // e.g. 600000
  hash: "SHA-256";
}

/**
 * Options for PBKDF2 key derivation.
 */
export interface KeyDerivationOptions {
  iterations?: number;
  hash?: "SHA-256";
  length?: number;
}

/**
 * TipTap / ProseMirror Document JSON representation.
 */
export interface TipTapNodeJSON {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNodeJSON[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
  [key: string]: unknown;
}

export interface TipTapDocumentJSON {
  type: "doc";
  content?: TipTapNodeJSON[];
  [key: string]: unknown;
}

/**
 * Result of encrypting a screenplay document.
 */
export interface EncryptedScreenplayResult {
  encryptedPayload: EncryptedPayload;
  revision?: number;
}
