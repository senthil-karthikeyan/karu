"use client";

import { create } from "zustand";
import {
  authApi,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  type UserResponse,
  type RegisterRequest,
  type LoginRequest,
  type UpdateUserRequest,
} from "@/lib/api";

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  login: (data: LoginRequest) => Promise<UserResponse>;
  register: (data: RegisterRequest) => Promise<UserResponse>;
  logout: () => Promise<void>;
  setUser: (user: UserResponse | null) => void;
  updateProfile: (data: UpdateUserRequest) => Promise<UserResponse>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initializeAuth: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isInitialized: true, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isInitialized: true, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isInitialized: true, isLoading: false });
    }
  },

  login: async (data: LoginRequest) => {
    set({ isLoading: true });
    try {
      const resp = await authApi.login(data);
      set({ user: resp.user, isAuthenticated: true, isInitialized: true, isLoading: false });
      return resp.user;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true });
    try {
      const resp = await authApi.register(data);
      set({ user: resp.user, isAuthenticated: true, isInitialized: true, isLoading: false });
      return resp.user;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    try {
      await authApi.logout(refreshToken || undefined);
    } catch {
      clearTokens();
    } finally {
      clearTokens();
      set({ user: null, isAuthenticated: false, isInitialized: true, isLoading: false });
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  updateProfile: async (data: UpdateUserRequest) => {
    const updated = await authApi.updateMe(data);
    set({ user: updated });
    return updated;
  },
}));
