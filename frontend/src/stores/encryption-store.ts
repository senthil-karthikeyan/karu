"use client";

import { create } from "zustand";
import {
  CURRENT_ENCRYPTION_VERSION,
  DEFAULT_PBKDF2_ITERATIONS,
  type UserEncryptionMetadata,
  type WrappedKeyPayload,
  type UserIdentityKeyPair,
  uint8ArrayToBase64,
  generateSalt,
  deriveUserEncryptionKey,
  generateScreenplayContentKey,
  wrapScreenplayContentKeyWithUEK,
  unwrapScreenplayContentKeyWithUEK,
  generateUserIdentityKeyPair,
  exportUserIdentityPublicKey,
  wrapUserPrivateKeyWithUEK,
  unwrapUserPrivateKeyWithUEK,
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
    secret: string
  ) => Promise<{ uek: CryptoKey; metadata: UserEncryptionMetadata; identityKeyPair: UserIdentityKeyPair }>;
  unlockWithSecret: (
    secret: string,
    metadata: UserEncryptionMetadata
  ) => Promise<CryptoKey>;
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
      const resp = await authApi.getEncryptionMetadata();
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
   * Initializes a brand-new encryption secret for a first-time user:
   * 1. Generates a fresh 16-byte random salt.
   * 2. Derives the 256-bit AES-GCM User Encryption Key (UEK) using PBKDF2.
   * 3. Generates the user's asymmetric ECDH P-256 identity keypair.
   * 4. Wraps private key with UEK.
   * 5. Registers metadata & identity payload with backend.
   */
  setupNewSecret: async (secret: string) => {
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

      // 4. Save metadata to backend
      await authApi.setEncryptionMetadata({
        salt: metadata.salt,
        iterations: metadata.iterations,
        hashAlgorithm: metadata.hash,
      });

      // 5. Save identity payload to backend
      await authApi.setEncryptionIdentity({
        publicKey: publicExport.publicKey,
        encryptedPrivateKey: wrappedPrivateKey.wrappedKey,
        keyIv: wrappedPrivateKey.iv,
        algorithm: "ECDH-P256",
        version: CURRENT_ENCRYPTION_VERSION,
      });

      set({
        isUnlocked: true,
        activeUEK: uek,
        identityKeyPair,
        userMetadata: metadata,
        isLoading: false,
      });

      return { uek, metadata, identityKeyPair };
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
        const idPayload = await authApi.getEncryptionIdentity();
        if (idPayload && idPayload.encryptedPrivateKey && idPayload.keyIv) {
          const privateKey = await unwrapUserPrivateKeyWithUEK(uek, {
            version: CURRENT_ENCRYPTION_VERSION,
            algorithm: (idPayload.algorithm as "AES-GCM") || "AES-GCM",
            iv: idPayload.keyIv,
            wrappedKey: idPayload.encryptedPrivateKey,
          });

          const subtle = window.crypto.subtle;
          const pubKeyBytes = Uint8Array.from(atob(idPayload.publicKey), (c) => c.charCodeAt(0));
          const publicKey = await subtle.importKey(
            "spki",
            pubKeyBytes,
            {
              name: "ECDH",
              namedCurve: "P-256",
            },
            true,
            []
          );

          identityKeyPair = { publicKey, privateKey };
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
   * Loads the wrapped key for a screenplay from the backend and unwraps it into memory directly with active UEK.
   */
  loadAndUnlockScreenplayKey: async (screenplayId: string) => {
    const { activeUEK, screenplayKeys } = get();
    if (screenplayKeys[screenplayId]) {
      return screenplayKeys[screenplayId];
    }
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const rawKey = await screenplaysApi.getScreenplayKey(screenplayId);
    const wrappedKey: WrappedKeyPayload = {
      version: CURRENT_ENCRYPTION_VERSION,
      algorithm: "AES-GCM",
      iv: rawKey.iv,
      wrappedKey: rawKey.wrappedKey,
    };

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
