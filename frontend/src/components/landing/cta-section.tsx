"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gsap, isReducedMotion, MOTION_CONFIG } from "@/lib/motion";

export function CTASection() {
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
        .from(".cta-badge", {
          opacity: 0,
          y: distance * 0.5,
          duration: 0.6,
        })
        .from(
          ".cta-heading",
          {
            opacity: 0,
            y: distance,
            duration: 0.8,
          },
          "-=0.4"
        )
        .from(
          ".cta-subtext",
          {
            opacity: 0,
            y: distance * 0.7,
            duration: 0.7,
          },
          "-=0.5"
        )
        .from(
          ".cta-buttons",
          {
            opacity: 0,
            y: distance * 0.6,
            duration: 0.6,
          },
          "-=0.4"
        )
        .from(
          ".cta-footnote",
          {
            opacity: 0,
            duration: 0.6,
          },
          "-=0.3"
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 border-t border-border/60 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 blur-[100px] pointer-events-none rounded-full" />

      <div className="container mx-auto px-4 sm:px-8 max-w-4xl text-center relative z-10 space-y-8">
        <div className="cta-badge inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-muted/60 text-xs font-medium text-muted-foreground shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Your Story Begins on Page One</span>
        </div>

        <div className="space-y-4">
          <h2 className="cta-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Ready to write your next screenplay?
          </h2>
          <p className="cta-subtext text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Open Karu and start writing on an authentic, protected screenplay canvas with professional formatting in seconds.
          </p>
        </div>

        <div className="cta-buttons flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button size="lg" className="rounded-full px-8 font-semibold text-sm shadow-md gap-2 h-12">
              <span>Start Writing — It&apos;s Free</span>
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

        <p className="cta-footnote text-xs text-muted-foreground pt-4">
          No credit card required • Client-side protected • Courier Prime formatting
        </p>
      </div>
    </section>
  );
}
