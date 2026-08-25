"use client";

import Link from "next/link";
import { ArrowRight, FileText, FolderKanban, Download, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function LandingHero() {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="container mx-auto px-4 sm:px-8 max-w-6xl relative z-10 text-center space-y-8">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/60 text-xs font-medium text-muted-foreground shadow-2xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Screenwriting &amp; Film Workspace</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            The film workspace for storytellers
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Write, organize, and bring your stories to life. All in one beautiful, distraction-free workspace.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button size="lg" className="rounded-full px-8 font-semibold text-sm shadow-md gap-2 h-12">
              <span>Start Writing</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <a href="#product">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-6 font-medium text-sm h-12 border-border"
            >
              Explore Workspace
            </Button>
          </a>
        </div>

        {/* Hero Visual Preview Card */}
        <div className="pt-8 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xl overflow-hidden relative group">
            {/* Window chrome header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/40 rounded-t-xl mb-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-medium">Karu Studio — Midnight Train (Draft 2)</span>
              <Badge variant="outline" className="text-[10px] font-mono">112 Pages</Badge>
            </div>

            {/* Screenplay Mock Editor Preview */}
            <div className="bg-background rounded-lg border border-border/50 p-6 sm:p-12 text-left font-screenplay text-xs sm:text-sm leading-relaxed max-w-3xl mx-auto shadow-inner">
              <h2 className="font-bold text-sm sm:text-base uppercase mb-4 text-foreground">
                2. INT. TRAIN COMPARTMENT - NIGHT
              </h2>
              <p className="mb-4 text-foreground/90">
                The train rocks gently as rain hits the double-paned windows. Polished mahogany panels and velvet upholstery evoke an era long past.
              </p>
              <p className="font-bold uppercase ml-[37%] mb-0.5 text-foreground">MEERA</p>
              <p className="italic ml-[30%] mb-0.5 text-muted-foreground">(softly)</p>
              <p className="ml-[20%] max-w-[60%] mb-4 text-foreground">
                Where are you taking me?
              </p>
              <p className="mb-4 text-foreground/90">
                Across from her, the OLD MAN smiles faintly. His eyes reflect the amber reading lamp above.
              </p>
              <p className="font-bold uppercase ml-[37%] mb-0.5 text-foreground">OLD MAN</p>
              <p className="ml-[20%] max-w-[60%] mb-4 text-foreground">
                To a place you need to be.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Feature Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-12 text-left">
          <div className="p-5 rounded-xl border border-border/60 bg-card space-y-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Screenplay Editor</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Write with focus using industry-standard Courier formatting and sluglines.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border/60 bg-card space-y-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Organize Everything</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Keep loglines, scenes, synopsis, and drafts structured in one clean workspace.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border/60 bg-card space-y-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Focused &amp; Personal</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A private writing haven without team noise, comments, or distractions.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border/60 bg-card space-y-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Download className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Export Anywhere</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export to print-ready PDF, open Fountain format, or clean Plain Text.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
