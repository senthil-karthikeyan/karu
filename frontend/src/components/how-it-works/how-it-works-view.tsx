"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  UserPlus,
  KeyRound,
  FolderPlus,
  FileText,
  Keyboard,
  Compass,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gsap, isReducedMotion, MOTION_CONFIG } from "@/lib/motion";

const WORKFLOW_STEPS = [
  {
    step: "01",
    icon: UserPlus,
    title: "Create Your Filmmaker Account",
    subtitle: "A private studio workspace built for you",
    description:
      "Sign up in seconds using your email address or Google authentication. Karu gives you a clean, dedicated personal workspace free from team noise, public feeds, or distractions.",
    highlight: "Zero ads • Personal writing haven",
    preview: (
      <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2 text-xs">
          <span className="font-semibold text-foreground">Karu Workspace</span>
          <span className="text-muted-foreground">Ready in seconds</span>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>✓ Email &amp; Password or Google Sign-In</p>
          <p>✓ Fast, distraction-free onboarding</p>
          <p>✓ Independent writer studio</p>
        </div>
      </div>
    ),
  },
  {
    step: "02",
    icon: KeyRound,
    title: "Set Up Your Encryption Passphrase",
    subtitle: "Activate client-side protection for your screenplays",
    description:
      "Choose a memorable encryption passphrase to protect your creative work. Karu also generates a downloadable Recovery Code (.txt) you can safely store offline so you never risk losing access to your scripts.",
    highlight: "You hold the only key to unlock your scripts",
    preview: (
      <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2 text-xs">
          <span className="font-semibold text-foreground">Screenplay Protection</span>
          <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
            Protected
          </Badge>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p className="font-mono text-foreground">Passphrase: ••••••••••••••••</p>
          <p className="text-[11px]">Recovery Code: KARU-XXXX-XXXX-XXXX (.txt)</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">✓ Protected before leaving your browser</p>
        </div>
      </div>
    ),
  },
  {
    step: "03",
    icon: FolderPlus,
    title: "Create Your Film Project",
    subtitle: "Organize drafts, loglines, and story metadata",
    description:
      "Set your project title, format (Feature Film, Short Film, TV Pilot, or Series), genre, and logline in a centralized hub. Everything about your story stays organized in one place from inception to completion.",
    highlight: "Structured story development",
    preview: (
      <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2 text-xs">
          <span className="font-semibold text-foreground">The Phantom Signal</span>
          <Badge variant="outline" className="text-[10px]">Feature Film</Badge>
        </div>
        <p className="text-xs text-muted-foreground italic line-clamp-2">
          &ldquo;When a reclusive radio astronomer intercepts an impossible harmonic sequence...&rdquo;
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Sci-Fi Thriller</span>
          <span>•</span>
          <span>Draft 1</span>
        </div>
      </div>
    ),
  },
  {
    step: "04",
    icon: FileText,
    title: "Write on an Authentic Screenplay Canvas",
    subtitle: "Physical 8.5\" × 11\" dimensions and standard margins",
    description:
      "Step into an authentic screenplay canvas. Karu formats with industry-standard Courier Prime 12pt and precise indentation rules, giving you true-to-life physical page breaks and predictable timing.",
    highlight: "Standard 1 page ≈ 1 minute screen time",
    preview: (
      <div className="p-5 rounded-xl bg-background border border-border/70 font-screenplay text-xs leading-relaxed shadow-inner space-y-2">
        <p className="text-right text-[10px] text-muted-foreground">1.</p>
        <p className="font-bold uppercase text-foreground">1. INT. OBSERVATORY - NIGHT</p>
        <p className="text-foreground/90">A radio telescope dishes rotates against a canopy of stars.</p>
        <p className="font-bold uppercase ml-[37%] text-foreground">ARLO</p>
        <p className="ml-[20%] text-foreground">We have a lock on the frequency.</p>
      </div>
    ),
  },
  {
    step: "05",
    icon: Keyboard,
    title: "Write at the Speed of Thought with Shortcuts",
    subtitle: "Contextual flow and single-source hotkeys",
    description:
      "Press Enter after a character cue to immediately write dialogue. Hit Enter twice to return to action. Use Mod+Alt+1..9 to jump directly to any screenplay element, or customize shortcuts in Settings to match your muscle memory.",
    highlight: "Never reach for the mouse while in dialogue",
    preview: (
      <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Scene Heading</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">⌘⌥1</kbd>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Action</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">⌘⌥2</kbd>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Character</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">⌘⌥3</kbd>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Dialogue</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">⌘⌥4</kbd>
        </div>
      </div>
    ),
  },
  {
    step: "06",
    icon: Compass,
    title: "Navigate Scenes, Track Metrics & Snapshot Versions",
    subtitle: "Real-time outline and immutable milestones",
    description:
      "Use the Scene Navigator to jump instantly across acts. Monitor live page, scene, and word counts as you write. Save named version checkpoints at key milestones so you can write fearlessly knowing past drafts are preserved.",
    highlight: "Live telemetry and immutable revision history",
    preview: (
      <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded bg-muted/50">
            <span className="font-bold text-sm block">114</span>
            <span className="text-[10px] text-muted-foreground">Pages</span>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <span className="font-bold text-sm block">38</span>
            <span className="text-[10px] text-muted-foreground">Scenes</span>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <span className="font-bold text-sm block">22.4k</span>
            <span className="text-[10px] text-muted-foreground">Words</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Snapshot: &ldquo;End of Act II Polish&rdquo;</p>
      </div>
    ),
  },
  {
    step: "07",
    icon: Lock,
    title: "Continue Developing Your Story Securely",
    subtitle: "Protected when closed, seamless when unlocked",
    description:
      "When you return to Karu, simply enter your encryption passphrase to unlock and resume writing. Your screenplay content is stored in protected ciphertext, ensuring peace of mind throughout your production journey.",
    highlight: "Your words remain exclusively yours",
    preview: (
      <div className="p-5 rounded-xl bg-card border border-border/70 shadow-xs space-y-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
          <Lock className="h-4 w-4" />
          <span>Screenplay Protected</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Unlock with your passphrase on any supported browser and write with complete creative security.
        </p>
      </div>
    ),
  },
];

export function HowItWorksView() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isReducedMotion() || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const distance = MOTION_CONFIG.getDistance();

      // Animate top header
      gsap.from(".hiw-header", {
        opacity: 0,
        y: distance,
        duration: 0.8,
        ease: MOTION_CONFIG.ease,
      });

      // Animate each timeline step on scroll
      const stepCards = gsap.utils.toArray<HTMLElement>(".hiw-step-card");
      stepCards.forEach((card) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            once: true,
          },
          opacity: 0,
          y: distance,
          duration: 0.75,
          ease: MOTION_CONFIG.ease,
        });
      });

      // Animate bottom CTA
      gsap.from(".hiw-cta", {
        scrollTrigger: {
          trigger: ".hiw-cta",
          start: "top 85%",
          once: true,
        },
        opacity: 0,
        y: distance * 1.1,
        duration: 0.85,
        ease: MOTION_CONFIG.ease,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="container mx-auto px-4 sm:px-8 max-w-5xl space-y-16">
      {/* Header */}
      <div className="hiw-header text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-muted/60 text-xs font-medium text-muted-foreground shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>The Karu Filmmaker Journey</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.12]">
          How Karu Helps You Write and Develop Screenplays
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          From your first idea to a completed shooting draft: an authentic, protected screenwriting workspace built around the cinematic storytelling craft.
        </p>
      </div>

      {/* Steps Timeline */}
      <div className="space-y-12">
        {WORKFLOW_STEPS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="hiw-step-card p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-primary/80">
                    {item.step}
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className="text-[11px] font-normal">
                    {item.highlight}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    {item.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-primary">
                    {item.subtitle}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="lg:col-span-5">
                {item.preview}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA Banner */}
      <div className="hiw-cta p-8 sm:p-12 rounded-3xl border border-border/80 bg-card text-center space-y-6 shadow-xl relative overflow-hidden">
        <div className="space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Ready to begin your screenplay?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Join filmmakers who write with focus, authentic screenplay formatting, and private protection.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button size="lg" className="rounded-full px-8 font-semibold text-sm shadow-md gap-2 h-12">
              <span>Start Writing Now</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/privacy">
            <Button variant="outline" size="lg" className="rounded-full px-6 font-medium text-sm h-12">
              Learn About Our Privacy
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
