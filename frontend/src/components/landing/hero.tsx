"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  FileText,
  Layers,
  Keyboard,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gsap, isReducedMotion, MOTION_CONFIG } from "@/lib/motion";

export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isReducedMotion() || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const distance = MOTION_CONFIG.getDistance();
      const tl = gsap.timeline({ defaults: { ease: MOTION_CONFIG.ease } });

      tl.from(".hero-badge", {
        opacity: 0,
        y: distance * 0.5,
        duration: 0.6,
      })
        .from(
          ".hero-headline",
          {
            opacity: 0,
            y: distance,
            duration: 0.8,
          },
          "-=0.4"
        )
        .from(
          ".hero-subhead",
          {
            opacity: 0,
            y: distance * 0.7,
            duration: 0.7,
          },
          "-=0.5"
        )
        .from(
          ".hero-cta",
          {
            opacity: 0,
            y: distance * 0.5,
            duration: 0.6,
          },
          "-=0.4"
        )
        .from(
          ".hero-mockup",
          {
            opacity: 0,
            y: distance * 1.2,
            scale: 0.985,
            duration: 0.9,
          },
          "-=0.3"
        )
        .from(
          ".hero-pillar",
          {
            opacity: 0,
            y: distance * 0.7,
            stagger: 0.08,
            duration: 0.6,
          },
          "-=0.4"
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="container mx-auto px-4 sm:px-8 max-w-6xl relative z-10 text-center space-y-8">
        {/* Top Tagline Badge */}
        <div className="hero-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-muted/60 text-xs font-medium text-muted-foreground shadow-2xs backdrop-blur-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Professional Screenwriting Studio</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="hero-headline text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
            Write Your Story.
            <br />
            <span className="text-muted-foreground">Build Your Film.</span>
          </h1>
          <p className="hero-subhead text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Karu gives filmmakers a focused workspace to write, structure, and develop screenplays with professional screenplay formatting and a secure writing environment.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button size="lg" className="rounded-full px-8 font-semibold text-sm shadow-md gap-2 h-12">
              <span>Start Writing</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/how-it-works">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-6 font-medium text-sm h-12 border-border"
            >
              See How It Works
            </Button>
          </Link>
        </div>

        {/* Hero Visual: Authentic Karu Screenplay Studio Mockup */}
        <div className="hero-mockup pt-8 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-5 shadow-2xl overflow-hidden relative text-left">
            {/* Window Chrome Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60 bg-muted/40 rounded-t-xl mb-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-semibold text-foreground ml-2 text-xs truncate max-w-[200px] sm:max-w-none">
                  Karu Studio — THE PHANTOM SIGNAL (Draft 1)
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Single Protected Badge */}
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Lock className="h-3 w-3" />
                  <span>Protected</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono hidden sm:inline-flex">
                  Page 1 of 114
                </Badge>
              </div>
            </div>

            {/* Simulated Editor Toolbar */}
            <div className="flex items-center gap-1 px-2 py-2 mb-4 border-b border-border/40 bg-background/80 rounded-lg text-xs overflow-x-auto">
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-primary text-primary-foreground">
                Scene Heading
              </span>
              <span className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground">
                Action
              </span>
              <span className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground">
                Character
              </span>
              <span className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground">
                Dialogue
              </span>
              <span className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground hidden sm:inline">
                Parenthetical
              </span>
              <span className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground hidden sm:inline">
                Transition
              </span>
              <span className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground">
                More ▾
              </span>
            </div>

            {/* Screenplay Physical Page Preview */}
            <div className="bg-background rounded-xl border border-border/60 p-6 sm:p-12 font-screenplay text-xs sm:text-sm leading-relaxed max-w-3xl mx-auto shadow-inner space-y-4">
              {/* Scene Heading */}
              <p className="font-bold uppercase text-foreground tracking-wide">
                1. EXT. MAUNA KEA OBSERVATORY - NIGHT
              </p>

              {/* Action */}
              <p className="text-foreground/90">
                A blizzard howls over the snow-crusted summit. Inside the geodesic dome, red indicator lights pulse across massive server racks in rhythm with the howling wind.
              </p>

              {/* Action */}
              <p className="text-foreground/90">
                DR. ARLO CHEN (30s) wipes frost from an analog radio receiver. Static CRACKLES, then sharpens into an unmistakable harmonic tone.
              </p>

              {/* Character Cue */}
              <p className="font-bold uppercase ml-[37%] text-foreground">
                ARLO
              </p>

              {/* Parenthetical */}
              <p className="italic ml-[31%] text-muted-foreground">
                (into handheld mic)
              </p>

              {/* Dialogue */}
              <p className="ml-[20%] max-w-[60%] text-foreground">
                Base Camp, are you receiving this frequency? It isn&apos;t background radiation. It&apos;s a repeating carrier sequence.
              </p>

              {/* Transition */}
              <p className="text-right uppercase font-bold text-muted-foreground pt-2">
                SMASH CUT TO:
              </p>
            </div>
          </div>
        </div>

        {/* 4 Feature Pillars Grid (Accurate to implemented product) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-10 text-left">
          <div className="hero-pillar p-5 rounded-xl border border-border/60 bg-card space-y-2.5 shadow-2xs hover:border-border transition-colors">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Physical Screenplay Canvas</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Authentic 8.5&quot; × 11&quot; pages with Courier Prime 12pt typography and predictable pagination.
            </p>
          </div>

          <div className="hero-pillar p-5 rounded-xl border border-border/60 bg-card space-y-2.5 shadow-2xs hover:border-border transition-colors">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Intelligent Structure</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Karu understands screenplay elements from Scene Heading to Dialogue with natural contextual flow.
            </p>
          </div>

          <div className="hero-pillar p-5 rounded-xl border border-border/60 bg-card space-y-2.5 shadow-2xs hover:border-border transition-colors">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Keyboard className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Fluid Keyboard Shortcuts</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Single-source hotkeys and customizable bindings keep your hands on the keys and in the story.
            </p>
          </div>

          <div className="hero-pillar p-5 rounded-xl border border-border/60 bg-card space-y-2.5 shadow-2xs hover:border-border transition-colors">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Protected Writing</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your screenplays are protected with a private passphrase and recovery code safeguard.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
