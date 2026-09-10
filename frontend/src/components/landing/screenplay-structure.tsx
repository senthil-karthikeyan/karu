"use client";

import { useEffect, useRef } from "react";
import { Layers, CornerDownLeft, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { gsap, isReducedMotion, MOTION_CONFIG } from "@/lib/motion";

const STRUCTURE_ELEMENTS = [
  {
    type: "Scene Heading",
    tag: "SLUGLINE",
    example: "INT. OBSERVATORY CONTROL ROOM - NIGHT",
    description: "Establishes physical camera location, environment, and time of day with uppercase formatting.",
    flowNext: "Action",
  },
  {
    type: "Action",
    tag: "NARRATIVE",
    example: "Heavy cables snake across the floor. Rain drums against the domed skylight.",
    description: "Vivid, present-tense visual and auditory description across the full screenplay column.",
    flowNext: "Character",
  },
  {
    type: "Character",
    tag: "SPEAKER",
    example: "DR. ARLO CHEN",
    description: "Centered speaker cue identifying who is speaking before dialogue delivery.",
    flowNext: "Dialogue",
  },
  {
    type: "Dialogue",
    tag: "VOICE",
    example: "The coordinates aren't random. Someone tuned this dish from the inside.",
    description: "Indented dialogue block formatted strictly to industry screenplay column standards.",
    flowNext: "Action / Character",
  },
  {
    type: "Parenthetical",
    tag: "DELIVERY",
    example: "(holding breath)",
    description: "Compact delivery instructions nestled between character cue and dialogue.",
    flowNext: "Dialogue",
  },
  {
    type: "Transition",
    tag: "PACING",
    example: "SMASH CUT TO:",
    description: "Right-aligned visual punctuation marking major narrative shifts and cuts.",
    flowNext: "Scene Heading",
  },
];

export function ScreenplayStructure() {
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
        .from(".structure-header", {
          opacity: 0,
          y: distance,
          duration: 0.75,
        })
        .from(
          ".structure-card",
          {
            opacity: 0,
            y: distance,
            stagger: 0.08,
            duration: 0.65,
          },
          "-=0.3"
        )
        .from(
          ".structure-banner",
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
    <section ref={sectionRef} id="structure" className="py-20 border-t border-border/60 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-8 max-w-6xl space-y-12">
        {/* Section Header */}
        <div className="structure-header text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Layers className="h-4 w-4" />
            <span>Screenplay Structure</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Karu understands the structure of your screenplay.
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Your script is more than plain text. Karu treats every line as a semantic screenplay element, giving you effortless formatting, accurate scene boundaries, and natural writing flow.
          </p>
        </div>

        {/* Structural Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {STRUCTURE_ELEMENTS.map((el) => (
            <div
              key={el.type}
              className="structure-card p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{el.type}</span>
                  <Badge variant="outline" className="text-[10px] tracking-wider font-mono">
                    {el.tag}
                  </Badge>
                </div>

                {/* Visual Typography Snippet */}
                <div className="p-3 rounded-lg bg-background border border-border/60 font-screenplay text-xs text-foreground/90 leading-snug">
                  {el.type === "Character" ? (
                    <span className="font-bold text-center block uppercase">{el.example}</span>
                  ) : el.type === "Transition" ? (
                    <span className="font-bold text-right block uppercase text-muted-foreground">{el.example}</span>
                  ) : el.type === "Parenthetical" ? (
                    <span className="italic text-center block text-muted-foreground">{el.example}</span>
                  ) : el.type === "Scene Heading" ? (
                    <span className="font-bold uppercase text-foreground">{el.example}</span>
                  ) : (
                    <span>{el.example}</span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {el.description}
                </p>
              </div>

              {/* Context Flow Hint */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3 text-primary" />
                  <span>Press Enter</span>
                </span>
                <span className="font-medium text-foreground flex items-center gap-1">
                  <span>→ {el.flowNext}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Context-Aware Flow Banner */}
        <div className="structure-banner p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Context-Aware Typing</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Never think about formatting margins while you write.
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Type a character name and hit <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-xs">Enter</kbd>—Karu automatically indents for dialogue. Finish dialogue and press <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-xs">Enter</kbd> twice to return to action.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3.5 py-2 rounded-xl border border-border/60">
              <Check className="h-4 w-4 text-emerald-500" />
              <span>Auto-detects INT. &amp; EXT.</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3.5 py-2 rounded-xl border border-border/60">
              <Check className="h-4 w-4 text-emerald-500" />
              <span>Uppercase speaker cues</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
