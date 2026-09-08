"use client";

import { create } from "zustand";
import {
  CURRENT_ENCRYPTION_VERSION,
  DEFAULT_PBKDF2_ITERATIONS,
  type UserEncryptionMetadata,
  type WrappedKeyPayload,
  type UserIdentityKeyPair,
  uint8ArrayToBase64,
  base64ToUint8Array,
  generateSalt,
  deriveUserEncryptionKey,
  generateScreenplayContentKey,
  wrapScreenplayContentKeyWithUEK,
  unwrapScreenplayContentKeyWithUEK,
  generateUserIdentityKeyPair,
  exportUserIdentityPublicKey,
  wrapUserPrivateKeyWithUEK,
  unwrapUserPrivateKeyWithUEK,
  generateEmergencyRecoveryKey,
  deriveRecoveryWrappingKey,
  wrapPrivateKeyWithRecoveryKey,
  unwrapPrivateKeyWithRecoveryKey,
  downloadRecoveryKit,
  unwrapKeyWithECIES,
} from "@/lib/crypto";
import { authApi } from "@/lib/api/auth";
import { screenplaysApi } from "@/lib/api/screenplays";

interface EncryptionState {
  // Ephemeral In-Memory State (NEVER persisted to disk/storage)
  isUnlocked: boolean;
  activeUEK: CryptoKey | null;
  identityKeyPair: UserIdentityKeyPair | null;
  screenplayKeys: Record<string, CryptoKey>; // Map of screenplayId -> SCK
  userMetadata: UserEncryptionMetadata | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUserMetadata: () => Promise<UserEncryptionMetadata | null>;
  setupNewSecret: (
    secret: string,
    recoveryCode?: string
  ) => Promise<{ uek: CryptoKey; metadata: UserEncryptionMetadata; identityKeyPair: UserIdentityKeyPair; recoveryKey: string }>;
  unlockWithSecret: (
    secret: string,
    metadata: UserEncryptionMetadata
  ) => Promise<CryptoKey>;
  regenerateRecoveryKit: (
    email: string
  ) => Promise<string>;
  recoverPrivateKeyWithCode: (
    email: string,
    recoveryCode: string
  ) => Promise<CryptoKey>;
  resetPassphraseWithRecovery: (
    email: string,
    recoveryCode: string,
    newPassphrase: string
  ) => Promise<{ uek: CryptoKey; metadata: UserEncryptionMetadata }>;
  getScreenplayKey: (screenplayId: string) => CryptoKey | undefined;
  setScreenplayKey: (screenplayId: string, key: CryptoKey) => void;
  createAndWrapScreenplayKey: (
    screenplayId: string
  ) => Promise<{ sck: CryptoKey; wrappedKey: WrappedKeyPayload }>;
  loadAndUnlockScreenplayKey: (
    screenplayId: string
  ) => Promise<CryptoKey>;
  unlockScreenplayWithWrappedKey: (
    screenplayId: string,
    wrappedKey: WrappedKeyPayload
  ) => Promise<CryptoKey>;
  clearEncryptionSession: () => void;
}

export const useEncryptionStore = create<EncryptionState>((set, get) => ({
  isUnlocked: false,
  activeUEK: null,
  identityKeyPair: null,
  screenplayKeys: {},
  userMetadata: null,
  isLoading: false,
  error: null,

  /**
   * Fetches the user's registered encryption metadata (salt & iterations) from the backend.
   */
  fetchUserMetadata: async () => {
    try {
      const resp = await authApi.getEncryptionKeys();
      if (resp && resp.salt) {
        const metadata: UserEncryptionMetadata = {
          version: CURRENT_ENCRYPTION_VERSION,
          salt: resp.salt,
          iterations: resp.iterations || DEFAULT_PBKDF2_ITERATIONS,
          hash: ((resp.hashAlgorithm || (resp as Record<string, unknown>).hash_algorithm) as "SHA-256") || "SHA-256",
        };
        set({ userMetadata: metadata });
        return metadata;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Initializes a brand-new encryption secret for a user:
   * 1. Generates salt and derives 256-bit AES-GCM UEK.
   * 2. Generates asymmetric ECDH P-256 identity keypair.
   * 3. Wraps private key with UEK.
   * 4. Generates Emergency Recovery Code, derives recovery wrapping key, wraps private key.
   * 5. Saves consolidated encryption keys & recovery credentials to backend.
   */
  setupNewSecret: async (secret: string, recoveryCode?: string) => {
    set({ isLoading: true, error: null });

    try {
      const saltBytes = generateSalt();
      const saltBase64 = uint8ArrayToBase64(saltBytes);

      const metadata: UserEncryptionMetadata = {
        version: CURRENT_ENCRYPTION_VERSION,
        salt: saltBase64,
        iterations: DEFAULT_PBKDF2_ITERATIONS,
        hash: "SHA-256",
      };

      // 1. Derive master UEK
      const uek = await deriveUserEncryptionKey(secret, metadata.salt, { iterations: metadata.iterations });

      // 2. Generate asymmetric ECDH P-256 identity keypair
      const identityKeyPair = await generateUserIdentityKeyPair();

      // 3. Export public key and wrap private key with UEK
      const publicExport = await exportUserIdentityPublicKey(identityKeyPair.publicKey);
      const wrappedPrivateKey = await wrapUserPrivateKeyWithUEK(uek, identityKeyPair.privateKey);

      // 4. Generate recovery credentials
      const recoveryKey = recoveryCode || generateEmergencyRecoveryKey();
      const recoverySalt = uint8ArrayToBase64(generateSalt(16));
      const recoveryWrappingKey = await deriveRecoveryWrappingKey(recoveryKey, recoverySalt, {
        iterations: DEFAULT_PBKDF2_ITERATIONS,
      });
      const wrappedWithRecovery = await wrapPrivateKeyWithRecoveryKey(
        identityKeyPair.privateKey,
        recoveryWrappingKey
      );

      // 5. Save consolidated user encryption keys to backend
      await authApi.setEncryptionKeys({
        salt: metadata.salt,
        iterations: metadata.iterations,
        hashAlgorithm: metadata.hash,
        publicKey: publicExport.publicKey,
        encryptedPrivateKey: wrappedPrivateKey.wrappedKey,
        keyIv: wrappedPrivateKey.iv,
        algorithm: "ECDH-P256",
        version: CURRENT_ENCRYPTION_VERSION,
      });

      // 6. Save recovery credentials to backend
      await authApi.setRecoveryCredentials({
        credentialType: "recovery_code",
        salt: recoverySalt,
        iterations: DEFAULT_PBKDF2_ITERATIONS,
        hashAlgorithm: "SHA-256",
        wrappedPrivateKey: wrappedWithRecovery.wrappedPrivateKey,
        keyIv: wrappedWithRecovery.recoveryKeyIv,
        version: CURRENT_ENCRYPTION_VERSION,
      });

      set({
        isUnlocked: true,
        activeUEK: uek,
        identityKeyPair,
        userMetadata: metadata,
        isLoading: false,
      });

      return { uek, metadata, identityKeyPair, recoveryKey };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to setup encryption";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /**
   * Unlocks an existing user's session using their passphrase:
   * 1. Re-derives active UEK using registered salt & iterations.
   * 2. Fetches user identity payload and unwraps ECDH private key into memory.
   * 3. Sets session to unlocked.
   */
  unlockWithSecret: async (secret: string, metadata: UserEncryptionMetadata) => {
    set({ isLoading: true, error: null });

    try {
      const uek = await deriveUserEncryptionKey(secret, metadata.salt, { iterations: metadata.iterations });

      // Fetch and unwrap asymmetric identity keypair if available
      let identityKeyPair: UserIdentityKeyPair | null = null;
      try {
        const keysPayload = await authApi.getEncryptionKeys();
        if (keysPayload && keysPayload.encryptedPrivateKey && keysPayload.keyIv) {
          const privateKey = await unwrapUserPrivateKeyWithUEK(uek, {
            version: CURRENT_ENCRYPTION_VERSION,
            algorithm: (keysPayload.algorithm as "AES-GCM") || "AES-GCM",
            iv: keysPayload.keyIv,
            wrappedKey: keysPayload.encryptedPrivateKey,
          });

          let publicKey: CryptoKey | null = null;
          if (keysPayload.publicKey) {
            const subtle = window.crypto.subtle;
            const pubKeyBytes = base64ToUint8Array(keysPayload.publicKey);
            publicKey = await subtle.importKey(
              "spki",
              pubKeyBytes as BufferSource,
              {
                name: "ECDH",
                namedCurve: "P-256",
              },
              true,
              []
            );
          }

          if (publicKey && privateKey) {
            identityKeyPair = { publicKey, privateKey };
          }
        }
      } catch (idErr) {
        console.warn("Could not unwrap encryption identity keypair:", idErr);
      }

      set({
        isUnlocked: true,
        activeUEK: uek,
        identityKeyPair,
        userMetadata: metadata,
        isLoading: false,
      });

      return uek;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unlock encryption";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /**
   * Re-generates a new Emergency Recovery Kit while unlocked in memory.
   */
  regenerateRecoveryKit: async (email: string) => {
    const { identityKeyPair, isUnlocked } = get();
    if (!isUnlocked || !identityKeyPair) {
      throw new Error("Encryption session must be unlocked to regenerate recovery kit.");
    }

    const recoveryKey = generateEmergencyRecoveryKey();
    const recoverySalt = uint8ArrayToBase64(generateSalt(16));
    const recoveryWrappingKey = await deriveRecoveryWrappingKey(recoveryKey, recoverySalt, {
      iterations: DEFAULT_PBKDF2_ITERATIONS,
    });
    const { wrappedPrivateKey, recoveryKeyIv } = await wrapPrivateKeyWithRecoveryKey(
      identityKeyPair.privateKey,
      recoveryWrappingKey
    );

    await authApi.setRecoveryCredentials({
      credentialType: "recovery_code",
      salt: recoverySalt,
      iterations: DEFAULT_PBKDF2_ITERATIONS,
      hashAlgorithm: "SHA-256",
      wrappedPrivateKey,
      keyIv: recoveryKeyIv,
      version: CURRENT_ENCRYPTION_VERSION,
    });

    downloadRecoveryKit(recoveryKey, email);
    return recoveryKey;
  },

  /**
   * Unwraps the user's private key using their emergency recovery code and stored recovery credentials.
   */
  recoverPrivateKeyWithCode: async (email: string, recoveryCode: string) => {
    set({ isLoading: true, error: null });
    try {
      const lookup = await authApi.recoveryLookup(email);
      if (!lookup.doubleWrappedPrivateKey || !lookup.salt) {
        throw new Error("No recovery credentials found for this email address.");
      }

      const recoveryWrappingKey = await deriveRecoveryWrappingKey(recoveryCode, lookup.salt, {
        iterations: lookup.iterations || DEFAULT_PBKDF2_ITERATIONS,
      });

      const privateKey = await unwrapPrivateKeyWithRecoveryKey(
        lookup.doubleWrappedPrivateKey,
        lookup.keyIv,
        recoveryWrappingKey
      );

      set({ isLoading: false });
      return privateKey;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Recovery failed";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /**
   * Forgotten-password recovery reset:
   * 1. Unwraps the private key with the recovery code.
   * 2. Generates new salt and derives new UEK from newPassphrase.
   * 3. Re-wraps the same private key under the new UEK.
   * 4. Overwrites user_encryption_keys on the backend via recovery reset endpoint.
   */
  resetPassphraseWithRecovery: async (email: string, recoveryCode: string, newPassphrase: string) => {
    set({ isLoading: true, error: null });
    try {
      const privateKey = await get().recoverPrivateKeyWithCode(email, recoveryCode);
      const saltBytes = generateSalt();
      const saltBase64 = uint8ArrayToBase64(saltBytes);

      const metadata: UserEncryptionMetadata = {
        version: CURRENT_ENCRYPTION_VERSION,
        salt: saltBase64,
        iterations: DEFAULT_PBKDF2_ITERATIONS,
        hash: "SHA-256",
      };

      const newUEK = await deriveUserEncryptionKey(newPassphrase, metadata.salt, {
        iterations: metadata.iterations,
      });
      const wrappedPrivateKey = await wrapUserPrivateKeyWithUEK(newUEK, privateKey);

      // Reconstruct or fetch public key SPKI
      const keysPayload = await authApi.getEncryptionKeys().catch(() => null);
      let publicKeyBase64 = keysPayload?.publicKey;
      let publicKey: CryptoKey | null = null;

      if (publicKeyBase64) {
        const subtle = window.crypto.subtle;
        publicKey = await subtle.importKey(
          "spki",
          base64ToUint8Array(publicKeyBase64) as BufferSource,
          { name: "ECDH", namedCurve: "P-256" },
          true,
          []
        );
      }

      await authApi.recoveryReset({
        email,
        credentialType: "recovery_code",
        newEncryptionKeys: {
          salt: metadata.salt,
          iterations: metadata.iterations,
          hashAlgorithm: metadata.hash,
          publicKey: publicKeyBase64,
          encryptedPrivateKey: wrappedPrivateKey.wrappedKey,
          keyIv: wrappedPrivateKey.iv,
          algorithm: "ECDH-P256",
          version: CURRENT_ENCRYPTION_VERSION,
        },
      });

      set({
        isUnlocked: true,
        activeUEK: newUEK,
        identityKeyPair: publicKey ? { publicKey, privateKey } : null,
        userMetadata: metadata,
        isLoading: false,
      });

      return { uek: newUEK, metadata };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Password reset failed";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  getScreenplayKey: (screenplayId: string) => {
    return get().screenplayKeys[screenplayId];
  },

  setScreenplayKey: (screenplayId: string, key: CryptoKey) => {
    set((state) => ({
      screenplayKeys: {
        ...state.screenplayKeys,
        [screenplayId]: key,
      },
    }));
  },

  /**
   * Generates a new random Screenplay Content Key (SCK) and wraps it directly with the active UEK (canonical 2-tier).
   */
  createAndWrapScreenplayKey: async (screenplayId: string) => {
    const { activeUEK } = get();
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const sck = await generateScreenplayContentKey();
    const wrappedKey = await wrapScreenplayContentKeyWithUEK(activeUEK, sck);

    // Persist wrapped SCK to backend
    try {
      await screenplaysApi.setScreenplayKey(screenplayId, wrappedKey);
    } catch (apiErr) {
      console.warn("Could not sync wrapped screenplay key to backend immediately:", apiErr);
    }

    set((state) => ({
      screenplayKeys: {
        ...state.screenplayKeys,
        [screenplayId]: sck,
      },
    }));

    return { sck, wrappedKey };
  },

  /**
   * Loads the wrapped key for a screenplay from the backend and unwraps it into memory.
   * Handles both owner (wrapped under UEK) and collaborator (wrapped via ECIES under user public key).
   */
  loadAndUnlockScreenplayKey: async (screenplayId: string) => {
    const { activeUEK, identityKeyPair, screenplayKeys } = get();
    if (screenplayKeys[screenplayId]) {
      return screenplayKeys[screenplayId];
    }

    const rawKey = await screenplaysApi.getScreenplayKey(screenplayId);

    let sck: CryptoKey;
    const ephPub = (rawKey as unknown as Record<string, unknown>).ephemeralPublicKey as string | undefined;


    if (ephPub) {
      // Unwrapping via ECIES using collaborator's ECDH private key
      if (!identityKeyPair?.privateKey) {
        throw new Error("Encryption identity is locked. Please unlock your session to open shared screenplays.");
      }
      sck = await unwrapKeyWithECIES(identityKeyPair.privateKey, {
        ephemeralPublicKey: ephPub,
        iv: rawKey.iv,
        wrappedKey: rawKey.wrappedKey,
      });
    } else {
      // Unwrapping via direct owner UEK
      if (!activeUEK) {
        throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
      }
      const wrappedKey: WrappedKeyPayload = {
        version: CURRENT_ENCRYPTION_VERSION,
        algorithm: "AES-GCM",
        iv: rawKey.iv,
        wrappedKey: rawKey.wrappedKey,
      };
      sck = await unwrapScreenplayContentKeyWithUEK(activeUEK, wrappedKey);
    }

    set((state) => ({
      screenplayKeys: {
        ...state.screenplayKeys,
        [screenplayId]: sck,
      },
    }));

    return sck;
  },

  /**
   * Unwraps a stored Screenplay Content Key (SCK) directly using the active UEK.
   */
  unlockScreenplayWithWrappedKey: async (
    screenplayId: string,
    wrappedKey: WrappedKeyPayload
  ) => {
    const { activeUEK } = get();
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const sck = await unwrapScreenplayContentKeyWithUEK(activeUEK, wrappedKey);

    set((state) => ({
      screenplayKeys: {
        ...state.screenplayKeys,
        [screenplayId]: sck,
      },
    }));

    return sck;
  },

  /**
   * Purges all active CryptoKeys, User Identity, and ephemeral encryption state from memory.
   */
  clearEncryptionSession: () => {
    set({
      isUnlocked: false,
      activeUEK: null,
      identityKeyPair: null,
      screenplayKeys: {},
      userMetadata: null,
      isLoading: false,
      error: null,
    });
  },
}));
