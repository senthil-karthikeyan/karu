"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-24 border-t border-border/60 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 blur-[100px] pointer-events-none rounded-full" />

      <div className="container mx-auto px-4 sm:px-8 max-w-4xl text-center relative z-10 space-y-8">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-muted/60 text-xs font-medium text-muted-foreground shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Your Story Begins on Page One</span>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Ready to write your next screenplay?
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Open Karu and start writing on an authentic, protected screenplay canvas with professional formatting in seconds.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
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

        <p className="text-xs text-muted-foreground pt-4">
          No credit card required • Client-side protected • Courier Prime formatting
        </p>
      </div>
    </section>
  );
}
