"use client";

import { create } from "zustand";
import {
  CURRENT_ENCRYPTION_VERSION,
  DEFAULT_PBKDF2_ITERATIONS,
  type UserEncryptionMetadata,
  type WrappedKeyPayload,
  type WrappedProjectKeyPayload,
  type UserIdentityKeyPair,
  uint8ArrayToBase64,
  generateSalt,
  deriveUserEncryptionKey,
  generateProjectEncryptionKey,
  wrapProjectKeyWithUEK,
  unwrapProjectKeyWithUEK,
  generateScreenplayContentKey,
  wrapScreenplayKeyWithPEK,
  unwrapScreenplayKeyWithPEK,
  wrapScreenplayContentKey,
  unwrapScreenplayContentKey,
  generateUserIdentityKeyPair,
  exportUserIdentityPublicKey,
  wrapUserPrivateKeyWithUEK,
  unwrapUserPrivateKeyWithUEK,
} from "@/lib/crypto";
import { authApi } from "@/lib/api/auth";
import { projectsApi } from "@/lib/api/projects";
import { screenplaysApi } from "@/lib/api/screenplays";

interface EncryptionState {
  // Ephemeral In-Memory State (NEVER persisted to disk/storage)
  isUnlocked: boolean;
  activeUEK: CryptoKey | null;
  identityKeyPair: UserIdentityKeyPair | null;
  projectKeys: Record<string, CryptoKey>; // Map of projectId -> PEK
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
  getProjectKey: (projectId: string) => CryptoKey | undefined;
  setProjectKey: (projectId: string, key: CryptoKey) => void;
  createAndWrapProjectKey: (
    projectId: string
  ) => Promise<{ pek: CryptoKey; wrappedKey: WrappedKeyPayload }>;
  loadAndUnlockProjectKey: (projectId: string) => Promise<CryptoKey>;
  unlockProjectWithWrappedKey: (
    projectId: string,
    wrappedKey: WrappedKeyPayload
  ) => Promise<CryptoKey>;
  getScreenplayKey: (screenplayId: string) => CryptoKey | undefined;
  setScreenplayKey: (screenplayId: string, key: CryptoKey) => void;
  createAndWrapScreenplayKey: (
    screenplayId: string,
    projectId?: string
  ) => Promise<{ sck: CryptoKey; wrappedKey: WrappedKeyPayload }>;
  loadAndUnlockScreenplayKey: (
    screenplayId: string,
    projectId?: string
  ) => Promise<CryptoKey>;
  unlockScreenplayWithWrappedKey: (
    screenplayId: string,
    wrappedKey: WrappedKeyPayload,
    projectId?: string
  ) => Promise<CryptoKey>;
  clearEncryptionSession: () => void;
}

export const useEncryptionStore = create<EncryptionState>((set, get) => ({
  isUnlocked: false,
  activeUEK: null,
  identityKeyPair: null,
  projectKeys: {},
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
   * generating the User Identity keypair (ECDH P-256), and registering metadata & public identity on the backend.
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

      // 1. Derive User Master Key (UEK)
      const uek = await deriveUserEncryptionKey(secret, saltBytes, {
        iterations: metadata.iterations,
        hash: metadata.hash,
      });

      // 2. Generate User Encryption Identity (ECDH P-256)
      const identityKeyPair = await generateUserIdentityKeyPair();
      const publicExport = await exportUserIdentityPublicKey(identityKeyPair.publicKey);
      const wrappedPrivate = await wrapUserPrivateKeyWithUEK(uek, identityKeyPair.privateKey);

      // 3. Persist metadata to backend zero-knowledge store
      try {
        await authApi.setEncryptionMetadata({
          salt: metadata.salt,
          iterations: metadata.iterations,
          hashAlgorithm: metadata.hash,
        });

        // 4. Persist User Encryption Identity to backend
        await authApi.setEncryptionIdentity({
          publicKey: publicExport.publicKey,
          encryptedPrivateKey: wrappedPrivate.wrappedKey,
          keyIv: wrappedPrivate.iv,
          algorithm: "ECDH-P256",
          version: CURRENT_ENCRYPTION_VERSION,
        });
      } catch (apiErr) {
        console.warn("Could not sync encryption metadata or identity to backend immediately:", apiErr);
      }

      set({
        activeUEK: uek,
        identityKeyPair,
        userMetadata: metadata,
        isUnlocked: true,
        isLoading: false,
        error: null,
      });

      return { uek, metadata, identityKeyPair };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initialize encryption";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /**
   * Unlocks the user's encryption session using their secret and stored metadata salt,
   * restoring the active UEK and unwrapping their User Encryption Identity.
   */
  unlockWithSecret: async (secret: string, metadata: UserEncryptionMetadata) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Re-derive UEK
      const uek = await deriveUserEncryptionKey(secret, metadata.salt, {
        iterations: metadata.iterations,
        hash: metadata.hash,
      });

      // 2. Attempt to restore User Identity Keypair from backend
      let identityKeyPair: UserIdentityKeyPair | null = null;
      try {
        const ident = await authApi.getEncryptionIdentity();
        if (ident && ident.encryptedPrivateKey && ident.keyIv) {
          const privateKey = await unwrapUserPrivateKeyWithUEK(uek, {
            version: CURRENT_ENCRYPTION_VERSION,
            algorithm: "AES-GCM",
            iv: ident.keyIv,
            wrappedKey: ident.encryptedPrivateKey,
          });

          // Import public key from SPKI Base64
          const rawPubBytes = Buffer.from(ident.publicKey, "base64");
          const publicKey = await crypto.subtle.importKey(
            "spki",
            rawPubBytes as unknown as BufferSource,
            { name: "ECDH", namedCurve: "P-256" },
            true,
            []
          );

          identityKeyPair = { publicKey, privateKey };
        }
      } catch (identErr) {
        console.warn("Could not unwrap or fetch encryption identity during unlock:", identErr);
      }

      set({
        activeUEK: uek,
        identityKeyPair,
        userMetadata: metadata,
        isUnlocked: true,
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

  getProjectKey: (projectId: string) => {
    return get().projectKeys[projectId];
  },

  setProjectKey: (projectId: string, key: CryptoKey) => {
    set((state) => ({
      projectKeys: {
        ...state.projectKeys,
        [projectId]: key,
      },
    }));
  },

  /**
   * Generates a new random Project Encryption Key (PEK), wraps it with active UEK,
   * stores it to the backend, and saves it in memory.
   */
  createAndWrapProjectKey: async (projectId: string) => {
    const { activeUEK } = get();
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const pek = await generateProjectEncryptionKey();
    const wrappedKey = await wrapProjectKeyWithUEK(activeUEK, pek);

    try {
      await projectsApi.setProjectKey(projectId, wrappedKey);
    } catch (apiErr) {
      console.warn("Could not sync wrapped project key to backend immediately:", apiErr);
    }

    set((state) => ({
      projectKeys: {
        ...state.projectKeys,
        [projectId]: pek,
      },
    }));

    return { pek, wrappedKey };
  },

  /**
   * Loads the wrapped key for a project from the backend and unwraps it into memory.
   */
  loadAndUnlockProjectKey: async (projectId: string) => {
    const { activeUEK, projectKeys } = get();
    if (projectKeys[projectId]) {
      return projectKeys[projectId];
    }
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const rawKey = await projectsApi.getProjectKey(projectId);
    const wrappedKey: WrappedProjectKeyPayload = {
      projectId,
      version: CURRENT_ENCRYPTION_VERSION,
      algorithm: "AES-GCM",
      iv: rawKey.iv,
      wrappedKey: rawKey.wrappedKey,
    };
    const pek = await unwrapProjectKeyWithUEK(activeUEK, wrappedKey);

    set((state) => ({
      projectKeys: {
        ...state.projectKeys,
        [projectId]: pek,
      },
    }));

    return pek;
  },

  /**
   * Unwraps a stored Project Encryption Key (PEK) using the active UEK.
   */
  unlockProjectWithWrappedKey: async (
    projectId: string,
    wrappedKey: WrappedKeyPayload
  ) => {
    const { activeUEK } = get();
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const pek = await unwrapProjectKeyWithUEK(activeUEK, wrappedKey);

    set((state) => ({
      projectKeys: {
        ...state.projectKeys,
        [projectId]: pek,
      },
    }));

    return pek;
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
   * Generates a new random Screenplay Content Key (SCK).
   * If a projectId is provided and its PEK is available/loaded, wraps SCK with PEK (3-tier).
   * Otherwise falls back to wrapping with active UEK (2-tier direct).
   */
  createAndWrapScreenplayKey: async (screenplayId: string, projectId?: string) => {
    const { activeUEK, projectKeys, loadAndUnlockProjectKey } = get();
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    const sck = await generateScreenplayContentKey();
    let wrappedKey: WrappedKeyPayload;

    if (projectId) {
      let pek = projectKeys[projectId];
      if (!pek) {
        try {
          pek = await loadAndUnlockProjectKey(projectId);
        } catch {
          // If no PEK exists yet for project, generate one
          const created = await get().createAndWrapProjectKey(projectId);
          pek = created.pek;
        }
      }
      wrappedKey = await wrapScreenplayKeyWithPEK(pek, sck);
    } else {
      wrappedKey = await wrapScreenplayContentKey(activeUEK, sck);
    }

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
   * Tries PEK unwrapping first if projectId provided, falling back to UEK if needed.
   */
  loadAndUnlockScreenplayKey: async (screenplayId: string, projectId?: string) => {
    const { activeUEK, projectKeys, loadAndUnlockProjectKey } = get();
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
    let sck: CryptoKey;

    if (projectId) {
      let pek = projectKeys[projectId];
      if (!pek) {
        try {
          pek = await loadAndUnlockProjectKey(projectId);
        } catch {
          // fallback to activeUEK
        }
      }

      if (pek) {
        try {
          sck = await unwrapScreenplayKeyWithPEK(pek, wrappedKey);
        } catch {
          // Fallback to UEK for 2-tier legacy compatibility
          sck = await unwrapScreenplayContentKey(activeUEK, wrappedKey);
        }
      } else {
        sck = await unwrapScreenplayContentKey(activeUEK, wrappedKey);
      }
    } else {
      sck = await unwrapScreenplayContentKey(activeUEK, wrappedKey);
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
   * Unwraps a stored Screenplay Content Key (SCK) using PEK (if available) or UEK.
   */
  unlockScreenplayWithWrappedKey: async (
    screenplayId: string,
    wrappedKey: WrappedKeyPayload,
    projectId?: string
  ) => {
    const { activeUEK, projectKeys, loadAndUnlockProjectKey } = get();
    if (!activeUEK) {
      throw new Error("Encryption is locked. Please unlock with your encryption secret first.");
    }

    let sck: CryptoKey;
    if (projectId) {
      let pek = projectKeys[projectId];
      if (!pek) {
        try {
          pek = await loadAndUnlockProjectKey(projectId);
        } catch {
          // fallback
        }
      }

      if (pek) {
        try {
          sck = await unwrapScreenplayKeyWithPEK(pek, wrappedKey);
        } catch {
          sck = await unwrapScreenplayContentKey(activeUEK, wrappedKey);
        }
      } else {
        sck = await unwrapScreenplayContentKey(activeUEK, wrappedKey);
      }
    } else {
      sck = await unwrapScreenplayContentKey(activeUEK, wrappedKey);
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
   * Purges all active CryptoKeys, User Identity, and ephemeral encryption state from memory.
   */
  clearEncryptionSession: () => {
    set({
      isUnlocked: false,
      activeUEK: null,
      identityKeyPair: null,
      projectKeys: {},
      screenplayKeys: {},
      userMetadata: null,
      isLoading: false,
      error: null,
    });
  },
}));
