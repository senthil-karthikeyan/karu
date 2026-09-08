import { apiClient, setTokens, clearTokens } from "./client";

export interface UserPreferences {
  editorTheme: string;
  fontSize: number;
  spellCheck: boolean;
  wordWrap: boolean;
  autoSave: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  bio: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  preferences?: Partial<UserPreferences>;
}

export const authApi = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setTokens(res.accessToken, res.refreshToken);
    return res;
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setTokens(res.accessToken, res.refreshToken);
    return res;
  },

  async logout(refreshToken?: string): Promise<{ message: string }> {
    try {
      if (refreshToken) {
        await apiClient<{ message: string }>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      clearTokens();
    }
    return { message: "Logged out successfully" };
  },

  async getMe(): Promise<UserResponse> {
    return apiClient<UserResponse>("/users/me");
  },

  async updateMe(data: UpdateUserRequest): Promise<UserResponse> {
    return apiClient<UserResponse>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async getEncryptionMetadata(): Promise<{
    userId: string;
    salt: string;
    iterations: number;
    hashAlgorithm: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient("/users/me/encryption-metadata");
  },

  async setEncryptionMetadata(data: {
    salt: string;
    iterations?: number;
    hashAlgorithm?: string;
  }): Promise<{
    userId: string;
    salt: string;
    iterations: number;
    hashAlgorithm: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient("/users/me/encryption-metadata", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getEncryptionIdentity(): Promise<{
    userId: string;
    publicKey: string;
    encryptedPrivateKey: string;
    keyIv: string;
    algorithm: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient("/users/me/encryption-identity");
  },

  async setEncryptionIdentity(data: {
    publicKey: string;
    encryptedPrivateKey: string;
    keyIv: string;
    algorithm?: string;
    version?: number;
  }): Promise<{
    userId: string;
    publicKey: string;
    encryptedPrivateKey: string;
    keyIv: string;
    algorithm: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient("/users/me/encryption-identity", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getUserPublicKey(userId: string): Promise<{
    userId: string;
    publicKey: string;
    algorithm: string;
    version: number;
  }> {
    return apiClient(`/users/${userId}/public-key`);
  },

  async lookupUserByEmail(email: string): Promise<UserResponse> {
    return apiClient<UserResponse>(`/users/lookup?email=${encodeURIComponent(email)}`);
  },

  async getEncryptionKeys(): Promise<{
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
  }> {
    return apiClient("/users/me/encryption-keys");
  },

  async setEncryptionKeys(data: {
    salt: string;
    iterations?: number;
    hashAlgorithm?: string;
    publicKey?: string;
    encryptedPrivateKey?: string;
    keyIv?: string;
    algorithm?: string;
    version?: number;
  }): Promise<{
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
  }> {
    return apiClient("/users/me/encryption-keys", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getRecoveryCredentials(): Promise<{
    userId: string;
    credentialType: string;
    salt: string;
    iterations: number;
    hashAlgorithm: string;
    doubleWrappedPrivateKey?: string;
    keyIv: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient("/users/me/recovery-credentials");
  },

  async setRecoveryCredentials(data: {
    credentialType?: string;
    salt: string;
    iterations?: number;
    hashAlgorithm?: string;
    wrappedPrivateKey?: string;
    doubleWrappedPrivateKey?: string;
    keyIv: string;
    version?: number;
  }): Promise<{
    userId: string;
    credentialType: string;
    salt: string;
    iterations: number;
    hashAlgorithm: string;
    doubleWrappedPrivateKey?: string;
    keyIv: string;
    version: number;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient("/users/me/recovery-credentials", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async recoveryLookup(email: string): Promise<{
    userId: string;
    credentialType: string;
    salt: string;
    iterations: number;
    hashAlgorithm: string;
    doubleWrappedPrivateKey?: string;
    keyIv: string;
    version: number;
  }> {
    return apiClient("/auth/recovery/lookup", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async recoveryReset(data: {
    email: string;
    credentialType: string;
    newEncryptionKeys: {
      salt: string;
      iterations?: number;
      hashAlgorithm?: string;
      publicKey?: string;
      encryptedPrivateKey?: string;
      keyIv?: string;
      algorithm?: string;
      version?: number;
    };
    newRecoveryCredential?: {
      credentialType?: string;
      salt: string;
      iterations?: number;
      hashAlgorithm?: string;
      wrappedPrivateKey?: string;
      keyIv: string;
      version?: number;
    };
  }): Promise<{ message: string }> {
    return apiClient<{ message: string }>("/auth/recovery/reset", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

