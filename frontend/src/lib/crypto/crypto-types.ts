/**
 * Core cryptographic types and data models for Karu E2EE.
 *
 * KEY HIERARCHY:
 * 1. User Encryption Key (UEK): Derived via PBKDF2-SHA256 from user's master passphrase + salt.
 * 2. User Encryption Identity (UEI): Asymmetric ECDH P-256 keypair (Public Key stored on backend; Private Key wrapped by UEK).
 * 3. Screenplay Content Key (SCK): Random 256-bit AES-GCM key per screenplay.
 *    - For the owner: Wrapped using UEK or self-wrapped via ECIES.
 *    - For collaborators: Wrapped using ECIES (ECDH ephemeral keypair + recipient's public key + AES-256-GCM).
 * 4. Recovery Key: 128-bit random entropy used to wrap user's private key for zero-knowledge account recovery.
 * 5. Screenplay Content: Serialized TipTap JSON encrypted with SCK using AES-256-GCM with fresh 12-byte random IV.
 */

export const CURRENT_ENCRYPTION_VERSION = 1 as const;
export const CURRENT_ALGORITHM = "AES-GCM" as const;
export const ASYMMETRIC_ALGORITHM = "ECDH-P256" as const;
export const ECIES_ALGORITHM = "ECIES-P256-AES-GCM" as const;
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
 * ECIES wrapped key payload for sharing SCK with recipient using ECDH P-256 + AES-GCM.
 */
export interface ECIESWrappedKeyPayload {
  version: typeof CURRENT_ENCRYPTION_VERSION;
  algorithm: typeof ECIES_ALGORITHM;
  ephemeralPublicKey: string; // Base64 SPKI
  iv: string; // Base64 12-byte IV
  wrappedKey: string; // Base64 ciphertext
}

/**
 * Screenplay Content Key (SCK) wrapped for a user.
 */
export interface WrappedScreenplayKeyPayload extends WrappedKeyPayload {
  screenplayId: string;
  role?: "owner" | "editor" | "viewer";
  ephemeralPublicKey?: string;
}

/**
 * Screenplay Access Key record as stored and returned by backend.
 */
export interface ScreenplayAccessKey {
  id: string;
  screenplayId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  ephemeralPublicKey?: string;
  keyIv: string;
  wrappedKey: string;
  version: number;
  algorithm: string;
  grantedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Screenplay Collaborator information for access control and sharing.
 */
export interface ScreenplayCollaborator {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  grantedBy?: string;
  createdAt: string;
  updatedAt: string;
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
 * Consolidated User Encryption Keys record.
 */
export interface UserEncryptionKeys {
  userId: string;
  salt: string;
  iterations: number;
  hashAlgorithm: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
  keyIv?: string;
  algorithm: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Recovery Credentials stored on backend.
 */
export interface UserRecoveryCredentials {
  userId: string;
  recoverySalt: string;
  recoveryIterations: number;
  recoveryHashAlgorithm: string;
  wrappedPrivateKey: string;
  recoveryKeyIv: string;
  createdAt: string;
  updatedAt: string;
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
