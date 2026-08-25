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
};
