"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ShieldCheck, Lock, KeyRound, FileCheck, ArrowRight, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gsap, isReducedMotion, MOTION_CONFIG } from "@/lib/motion";

export function SecuritySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isReducedMotion() || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const distance = MOTION_CONFIG.getDistance();

      gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          once: true,
        },
        defaults: { ease: MOTION_CONFIG.ease },
      })
        .from(".security-header", {
          opacity: 0,
          y: distance,
          duration: 0.75,
        })
        .from(
          ".security-pillar",
          {
            opacity: 0,
            y: distance * 0.9,
            stagger: 0.1,
            duration: 0.7,
          },
          "-=0.3"
        )
        .from(
          ".security-banner",
          {
            opacity: 0,
            y: distance * 0.8,
            duration: 0.75,
          },
          "-=0.2"
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="security" className="py-20 border-t border-border/60 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-8 max-w-6xl space-y-12">
        {/* Section Header */}
        <div className="security-header text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Screenplay Protection</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Your screenplays are protected.
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Your unproduced scripts, story ideas, and character arcs are your most valuable creative assets. Karu protects your writing so only you have the keys to open it.
          </p>
        </div>

        {/* Protection Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Encryption Passphrase */}
          <div className="security-pillar p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-base text-foreground">Private Encryption Passphrase</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                When you create your workspace, you choose a personal passphrase. Your passphrase never leaves your device—our servers never see or store it.
              </p>
            </div>
          </div>

          {/* Pillar 2: Client-Side Protection */}
          <div className="security-pillar p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-base text-foreground">Protected While You Work</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Every line of dialogue and scene heading is protected in your browser before it is saved. Even in the cloud, your creative writing remains locked.
              </p>
            </div>
          </div>

          {/* Pillar 3: Recovery Code Safeguard */}
          <div className="security-pillar p-6 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FileCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-base text-foreground">Recovery Code Safeguard</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Karu generates an offline Recovery Code you can download and store safely. If you ever forget your passphrase, you never lose access to your stories.
              </p>
            </div>
          </div>
        </div>

        {/* Filmmaker Trust Banner */}
        <div className="security-banner p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold text-foreground">
              <EyeOff className="h-4 w-4 text-primary" />
              <span>We never train on or read your writing</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
              You retain 100% ownership and copyright of your work. Karu will never read your screenplays, sell your data, or use your creative storytelling to train artificial intelligence models.
            </p>
          </div>

          <Link href="/privacy" className="shrink-0">
            <Button variant="outline" className="rounded-full text-xs gap-1.5 border-border">
              <span>Read Our Privacy Policy</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
