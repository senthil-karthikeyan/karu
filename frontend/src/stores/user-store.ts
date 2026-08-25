"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserProfile } from "@/types/screenplay";
import { INITIAL_USER } from "@/lib/initial-data";

interface UserStore {
  user: UserProfile;
  isAuthenticated: boolean;
  login: (email: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updatePreferences: (preferences: Partial<UserProfile["preferences"]>) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: INITIAL_USER,
      isAuthenticated: true,

      login: (email: string) =>
        set((state) => ({
          isAuthenticated: true,
          user: {
            ...state.user,
            email,
          },
        })),

      logout: () => set({ isAuthenticated: false }),

      updateProfile: (updates) =>
        set((state) => ({
          user: {
            ...state.user,
            ...updates,
          },
        })),

      updatePreferences: (preferences) =>
        set((state) => ({
          user: {
            ...state.user,
            preferences: {
              ...state.user.preferences,
              ...preferences,
            },
          },
        })),
    }),
    {
      name: "karu_user_store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
