"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  LayoutTemplate,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  History,
  Compass,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gsap, isReducedMotion, MOTION_CONFIG } from "@/lib/motion";

export function ProductShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLElement>(null);
  const section2Ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isReducedMotion() || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const distance = MOTION_CONFIG.getDistance();

      // Section 1: Screenplay Editor Craft
      if (section1Ref.current) {
        gsap.timeline({
          scrollTrigger: {
            trigger: section1Ref.current,
            start: "top 82%",
            once: true,
          },
          defaults: { ease: MOTION_CONFIG.ease },
        })
          .from(".showcase-text-1", {
            opacity: 0,
            y: distance,
            duration: 0.8,
          })
          .from(
            ".showcase-card-1",
            {
              opacity: 0,
              y: distance * 1.2,
              duration: 0.85,
            },
            "-=0.4"
          );
      }

      // Section 2: Film Workspace Hub
      if (section2Ref.current) {
        gsap.timeline({
          scrollTrigger: {
            trigger: section2Ref.current,
            start: "top 82%",
            once: true,
          },
          defaults: { ease: MOTION_CONFIG.ease },
        })
          .from(".showcase-card-2", {
            opacity: 0,
            y: distance * 1.2,
            duration: 0.85,
          })
          .from(
            ".showcase-text-2",
            {
              opacity: 0,
              y: distance,
              duration: 0.8,
            },
            "-=0.4"
          );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} id="product" className="space-y-24 py-16 border-t border-border/60">
      {/* 1. Screenplay Editor Showcase */}
      <section ref={section1Ref} className="container mx-auto px-4 sm:px-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="showcase-text-1 lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <FileText className="h-4 w-4" />
              <span>Screenplay Editor</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Designed specifically for the craft of screenwriting.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              No generic word processors or improvised templates. Karu provides an authentic physical 8.5&quot; × 11&quot; page canvas with industry-standard screenplay formatting and typography.
            </p>

            <ul className="space-y-3 text-xs sm:text-sm text-foreground/90">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Standard Courier Prime 12pt typeface with strict screenplay margins</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Physical 8.5&quot; × 11&quot; page layout with real-time pagination</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Real-time statistics: live page count, scene count, and word count</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Silent autosave with database revision tracking to prevent overwrites</span>
              </li>
            </ul>

            <Link href="/dashboard">
              <Button className="rounded-full px-6 font-medium text-xs gap-2">
                <span>Try the Editor</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="showcase-card-1 lg:col-span-7">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xl space-y-4">
              {/* Editor Header Bar Mock */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">Screenplay Editor</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground">Courier Prime 12pt</span>
                  <Badge variant="outline" className="text-[10px] bg-muted/40">Autosaved</Badge>
                </div>
              </div>

              {/* Physical Page Simulation */}
              <div className="rounded-xl bg-background p-6 sm:p-8 font-screenplay text-xs leading-relaxed border border-border/60 shadow-inner space-y-3">
                <p className="text-right text-[10px] text-muted-foreground font-mono">1.</p>
                <h3 className="font-bold text-sm uppercase text-foreground">1. INT. TRAIN STATION - NIGHT</h3>
                <p className="text-foreground/90">
                  Steam hisses against cold iron girders. Rain lashes the arched glass ceiling.
                </p>
                <p className="font-bold uppercase ml-[37%] text-foreground">MEERA</p>
                <p className="italic ml-[31%] text-muted-foreground">(whispering)</p>
                <p className="ml-[20%] max-w-[60%] text-foreground">
                  Track nine. Exactly as the telegram said.
                </p>
                <p className="text-right uppercase font-bold text-muted-foreground pt-1">
                  CUT TO:
                </p>
              </div>

              {/* Footer Telemetry */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground font-mono">
                <span>Page 1 of 1</span>
                <span>Scene 1</span>
                <span>42 Words</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Film Workspace Showcase */}
      <section ref={section2Ref} className="container mx-auto px-4 sm:px-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="showcase-card-2 lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-bold text-lg text-foreground">The Phantom Signal</h4>
                  <p className="text-xs text-muted-foreground">Sci-Fi Thriller • Feature Film</p>
                </div>
                <Badge variant="default" className="text-xs">Draft 1 (Active)</Badge>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Logline</p>
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  &ldquo;When a reclusive radio astronomer intercepts an impossible harmonic sequence from deep space, she must decode it before an approaching solar storm permanently silences the observatory.&rdquo;
                </p>
              </div>

              {/* Centralized Telemetry Grid */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="font-bold text-base text-foreground">114</p>
                  <p className="text-[11px] text-muted-foreground">Pages</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="font-bold text-base text-foreground">38</p>
                  <p className="text-[11px] text-muted-foreground">Scenes</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                  <p className="font-bold text-base text-foreground">22,410</p>
                  <p className="text-[11px] text-muted-foreground">Words</p>
                </div>
              </div>

              {/* Version History Checkpoint Callout */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <History className="h-4 w-4 text-primary" />
                  <span>Version Milestone: <strong className="text-foreground">First Complete Draft</strong></span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Immutable Snapshot</span>
              </div>
            </div>
          </div>

          <div className="showcase-text-2 lg:col-span-5 order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <LayoutTemplate className="h-4 w-4" />
              <span>Film Workspace</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              All your screenplay details in one cohesive hub.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Keep your loglines, genres, screenplay stats, and version snapshots centralized. Everything you need to develop your film from page one to the final production draft.
            </p>

            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 text-xs sm:text-sm">
                <Compass className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <strong className="text-foreground">Scene Navigator:</strong> Jump straight to any scene or act in your script with instant outline synchronization.
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs sm:text-sm">
                <Gauge className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <strong className="text-foreground">Screenplay Metrics:</strong> Live tracking of scenes, dialogue density, and physical page estimates.
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs sm:text-sm">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <strong className="text-foreground">Distraction-Free Focus:</strong> Clean writing mode hides toolbar chrome so you can immerse in dialogue and story.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
