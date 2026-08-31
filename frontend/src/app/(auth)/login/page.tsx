"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Film, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface FormErrors {
  email?: string;
  password?: string;
  server?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth({ redirectIfAuthenticated: true });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Please enter your password.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, server: undefined }));

    try {
      const user = await login({ email: email.trim(), password });
      toast.success(`Welcome back, ${user.name || user.email}!`, {
        description: "Redirecting to your personal workspace...",
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Invalid email or password";
      setErrors((prev) => ({ ...prev, server: errorMsg }));
      toast.error("Login failed", {
        description: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    window.location.href = `${backendUrl}/auth/google`;
  };

  // Don't render the form while checking auth state or if already authenticated
  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left Column: Login Form */}
      <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-lg mx-auto w-full">
        {/* Top Logo */}
        <div>
          <Link href="/" className="flex items-center gap-2 group w-fit">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm">
              K
            </div>
            <span className="font-bold text-xl tracking-tight">karu</span>
          </Link>
        </div>

        {/* Center: Form */}
        <div className="py-8 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Log in to continue to your screenplay workspace.
            </p>
          </div>

          {/* Google Sign-in */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full h-10 font-medium text-xs gap-2 border-border"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border" />
            <span className="bg-background px-3 text-xs text-muted-foreground uppercase font-medium">
              or
            </span>
          </div>

          {errors.server && (
            <div className="p-3 text-xs rounded-md bg-destructive/10 border border-destructive/20 text-destructive font-medium">
              {errors.server}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`h-10 text-sm ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {errors.email && (
                <p className="text-xs text-destructive font-medium mt-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => toast.info("Password reset instructions sent to your email")}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`h-10 text-sm pr-9 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive font-medium mt-1">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
              />
              <Label htmlFor="remember" className="text-xs font-medium text-muted-foreground cursor-pointer">
                Remember me
              </Label>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-medium text-sm">
              {isSubmitting ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Karu Studio Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Cinematic Editorial Card */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-neutral-900 text-white relative overflow-hidden">
        {/* Background Image with overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="relative z-10 flex items-center gap-2">
          <Film className="h-5 w-5" />
          <span className="font-mono text-xs uppercase tracking-widest">Director&apos;s Edition</span>
        </div>

        <div className="relative z-10 space-y-4 max-w-md">
          <blockquote className="text-2xl font-serif italic leading-relaxed text-neutral-200">
            &ldquo;A screenplay is not simply dialogue—it is the architectural blueprint of emotion.&rdquo;
          </blockquote>
          <div className="space-y-0.5">
            <p className="font-semibold text-sm">KARU STUDIO</p>
            <p className="text-xs text-neutral-400">Crafted for independent writers &amp; filmmakers</p>
          </div>
        </div>
      </div>
    </div>
  );
}
