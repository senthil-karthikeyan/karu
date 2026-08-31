"use client";

import { create } from "zustand";
import {
  CURRENT_ENCRYPTION_VERSION,
  DEFAULT_PBKDF2_ITERATIONS,
  type UserEncryptionMetadata,
  type WrappedKeyPayload,
  uint8ArrayToBase64,
  generateSalt,
  deriveUserEncryptionKey,
  generateScreenplayContentKey,
  wrapScreenplayContentKey,
  unwrapScreenplayContentKey,
} from "@/lib/crypto";
import { authApi } from "@/lib/api/auth";
import { screenplaysApi } from "@/lib/api/screenplays";

interface EncryptionState {
  // Ephemeral In-Memory State (NEVER persisted to disk/storage)
  isUnlocked: boolean;
  activeUEK: CryptoKey | null;
  screenplayKeys: Record<string, CryptoKey>; // Map of screenplayId -> SCK
  userMetadata: UserEncryptionMetadata | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUserMetadata: () => Promise<UserEncryptionMetadata | null>;
  setupNewSecret: (
    secret: string
  ) => Promise<{ uek: CryptoKey; metadata: UserEncryptionMetadata }>;
  unlockWithSecret: (
    secret: string,
    metadata: UserEncryptionMetadata
  ) => Promise<CryptoKey>;
  getScreenplayKey: (screenplayId: string) => CryptoKey | undefined;
  setScreenplayKey: (screenplayId: string, key: CryptoKey) => void;
  createAndWrapScreenplayKey: (
    screenplayId: string
  ) => Promise<{ sck: CryptoKey; wrappedKey: WrappedKeyPayload }>;
  loadAndUnlockScreenplayKey: (screenplayId: string) => Promise<CryptoKey>;
  unlockScreenplayWithWrappedKey: (
    screenplayId: string,
    wrappedKey: WrappedKeyPayload
  ) => Promise<CryptoKey>;
  clearEncryptionSession: () => void;
}

export const useEncryptionStore = create<EncryptionState>((set, get) => ({
  isUnlocked: false,
  activeUEK: null,
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
   * Initializes encryption for the first time by generating a random salt, deriving the UEK,
   * and registering the salt & parameters on the backend.
   */
  setupNewSecret: async (secret: string) => {
    set({ isLoading: true, error: null });
    try {
      const saltBytes = generateSalt(16);
      const saltBase64 = uint8ArrayToBase64(saltBytes);

      const metadata: UserEncryptionMetadata = {
        version: CURRENT_ENCRYPTION_VERSION,
        salt: saltBase64,
        iterations: DEFAULT_PBKDF2_ITERATIONS,
        hash: "SHA-256",
      };

      const uek = await deriveUserEncryptionKey(secret, saltBytes, {
        iterations: metadata.iterations,
        hash: metadata.hash,
      });

      // Persist metadata to backend zero-knowledge store
      try {
        await authApi.setEncryptionMetadata({
          salt: metadata.salt,
          iterations: metadata.iterations,
          hashAlgorithm: metadata.hash,
        });
      } catch (apiErr) {
        console.warn("Could not sync encryption metadata to backend immediately:", apiErr);
      }

      set({
        activeUEK: uek,
        userMetadata: metadata,
        isUnlocked: true,
        isLoading: false,
        error: null,
      });

      return { uek, metadata };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initialize encryption";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /**
   * Unlocks the user's encryption session using their secret and stored metadata salt.
   */
  unlockWithSecret: async (secret: string, metadata: UserEncryptionMetadata) => {
    set({ isLoading: true, error: null });
    try {
      const uek = await deriveUserEncryptionKey(secret, metadata.salt, {
        iterations: metadata.iterations,
        hash: metadata.hash,
      });

      set({
        activeUEK: uek,
        userMetadata: metadata,
        isLoading: false,
        error: null,
      });

      return uek;
    } catch (err) {
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
   * Generates a new random Screenplay Content Key (SCK), wraps it with the active UEK,
   * and saves it to the backend.
   */
  createAndWrapScreenplayKey: async (screenplayId: string) => {
    const { activeUEK } = get();
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const sck = await generateScreenplayContentKey();
    const wrappedKey = await wrapScreenplayContentKey(activeUEK, sck);

    // Persist wrapped SCK to backend
    try {
      await screenplaysApi.setScreenplayKey(screenplayId, wrappedKey);
    } catch (apiErr) {
      console.warn("Could not sync wrapped key to backend immediately:", apiErr);
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
   */
  loadAndUnlockScreenplayKey: async (screenplayId: string) => {
    const { activeUEK } = get();
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const wrappedKey = await screenplaysApi.getScreenplayKey(screenplayId);
    const sck = await unwrapScreenplayContentKey(activeUEK, wrappedKey);

    set((state) => ({
      screenplayKeys: {
        ...state.screenplayKeys,
        [screenplayId]: sck,
      },
    }));

    return sck;
  },

  /**
   * Unwraps a stored Screenplay Content Key (SCK) using the active UEK.
   */
  unlockScreenplayWithWrappedKey: async (
    screenplayId: string,
    wrappedKey: WrappedKeyPayload
  ) => {
    const { activeUEK } = get();
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const sck = await unwrapScreenplayContentKey(activeUEK, wrappedKey);

    set((state) => ({
      screenplayKeys: {
        ...state.screenplayKeys,
        [screenplayId]: sck,
      },
    }));

    return sck;
  },

  /**
   * Purges all active CryptoKeys and ephemeral encryption state from memory.
   */
  clearEncryptionSession: () => {
    set({
      isUnlocked: false,
      activeUEK: null,
      screenplayKeys: {},
      userMetadata: null,
      isLoading: false,
      error: null,
    });
  },
}));
