"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { setTokens, authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refresh_token");

    if (!token) {
      toast.error("Authentication failed", {
        description: "No authentication token was received from the server.",
      });
      router.push("/login");
      return;
    }

    setTokens(token, refreshToken || undefined);

    authApi
      .getMe()
      .then((user) => {
        setUser(user);
        toast.success(`Welcome, ${user.name || user.email}!`, {
          description: "Signed in successfully via Google.",
        });
        router.push("/dashboard");
      })
      .catch((err) => {
        toast.error("Authentication error", {
          description: err instanceof Error ? err.message : "Failed to load user profile",
        });
        router.push("/login");
      });
  }, [searchParams, router, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4 p-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-lg animate-pulse">
        K
      </div>
      <h2 className="text-xl font-bold tracking-tight">Authenticating your studio session...</h2>
      <p className="text-sm text-muted-foreground">Please wait while we verify your Google credentials.</p>
      <div className="w-64 space-y-2 pt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
