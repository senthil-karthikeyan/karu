"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth(
  options: {
    requireAuth?: boolean;
    redirectTo?: string;
    redirectIfAuthenticated?: boolean;
    authenticatedRedirectTo?: string;
  } = {}
) {
  const {
    requireAuth = false,
    redirectTo = "/login",
    redirectIfAuthenticated = false,
    authenticatedRedirectTo = "/dashboard",
  } = options;
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    initializeAuth,
    login,
    register,
    logout,
    updateProfile,
  } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (isInitialized && requireAuth && !isAuthenticated && !isLoading) {
      router.replace(redirectTo);
    }
  }, [isInitialized, requireAuth, isAuthenticated, isLoading, router, redirectTo]);

  // Redirect authenticated users away from auth pages (login, signup)
  useEffect(() => {
    if (isInitialized && redirectIfAuthenticated && isAuthenticated && !isLoading) {
      router.replace(authenticatedRedirectTo);
    }
  }, [isInitialized, redirectIfAuthenticated, isAuthenticated, isLoading, router, authenticatedRedirectTo]);

  return {
    user,
    isAuthenticated,
    isLoading: !isInitialized || isLoading,
    login,
    register,
    logout,
    updateProfile,
  };
}
