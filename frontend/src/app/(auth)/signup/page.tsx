"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Film } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function SignUpPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuth({ redirectIfAuthenticated: true });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the Terms of Service & Privacy Policy");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await register({ name, email, password });
      toast.success("Account created successfully!", {
        description: `Welcome to Karu, ${user.name || name}!`,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error("Sign up failed", {
        description: err instanceof Error ? err.message : "Failed to create account",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    window.location.href = `${backendUrl}/auth/google`;
  };

  // Don't render the form while checking auth state or if already authenticated
  if (isLoading || isAuthenticated) {
    return null;
  }


  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left Column: Sign Up Form */}
      <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-lg mx-auto w-full">
        <div>
          <Link href="/" className="flex items-center gap-2 group w-fit">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm">
              K
            </div>
            <span className="font-bold text-xl tracking-tight">karu</span>
          </Link>
        </div>

        <div className="py-6 space-y-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Start your storytelling journey in a distraction-free workspace.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
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

          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground">
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirm" className="text-xs font-semibold text-muted-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(!!checked)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>.
              </Label>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-10 font-medium text-sm mt-2">
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Karu Studio Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Editorial Script Page Visual */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-neutral-950 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        <div className="relative z-10 flex items-center gap-2">
          <Film className="h-5 w-5" />
          <span className="font-mono text-xs uppercase tracking-widest">Karu Workspace</span>
        </div>

        {/* Realistic Screenplay mock paper card */}
        <div className="relative z-10 p-8 rounded-lg bg-white text-black max-w-sm mx-auto shadow-2xl font-screenplay text-xs leading-relaxed">
          <p className="text-center uppercase font-bold text-sm mb-4">SCREENPLAY<br />BY<br />YOU</p>
          <p className="text-center text-[10px] text-neutral-500">Draft 1.0 • Scene 1</p>
        </div>

        <div className="relative z-10 space-y-1 max-w-md">
          <p className="font-semibold text-sm">Focus purely on your craft.</p>
          <p className="text-xs text-neutral-400">Industry-standard Courier typography and instant export options.</p>
        </div>
      </div>
    </div>
  );
}
