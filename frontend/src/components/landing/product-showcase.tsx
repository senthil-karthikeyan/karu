"use client";

import Link from "next/link";
import {
  FileText,
  LayoutTemplate,
  Download,
  CheckCircle2,
  ArrowRight,
  Printer,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ProductShowcase() {
  return (
    <div id="product" className="space-y-24 py-16 border-t border-border/60">
      {/* 1. Screenplay Editor Showcase */}
      <section className="container mx-auto px-4 sm:px-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <FileText className="h-4 w-4" />
              <span>Screenplay Editor</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Designed specifically for the craft of screenwriting.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              No generic text editors or clunky word processors. Karu gives you instant formatting for scene headings, character cues, dialogue, parentheticals, and transitions.
            </p>

            <ul className="space-y-3 text-xs sm:text-sm text-foreground/90">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Industry-standard Courier Prime 12pt typeface</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Instant Scene Navigator to jump across acts</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Real-time page count, word count, and auto-save</span>
              </li>
            </ul>

            <Link href="/dashboard">
              <Button className="rounded-full px-6 font-medium text-xs gap-2">
                <span>Try the Editor</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xl">
              <div className="rounded-lg bg-background p-6 font-screenplay text-xs leading-relaxed border border-border/60 shadow-xs space-y-3">
                <h3 className="font-bold text-sm uppercase">1. INT. TRAIN STATION - NIGHT</h3>
                <p>Steam hisses against cold iron girders. Rain lashes the arched glass ceiling.</p>
                <p className="font-bold uppercase ml-[37%]">MEERA</p>
                <p className="italic ml-[30%] text-muted-foreground">(whispering)</p>
                <p className="ml-[20%] max-w-[60%]">Track nine. Exactly as the telegram said.</p>
                <p className="text-right uppercase font-bold text-muted-foreground">CUT TO:</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Film Workspace Showcase */}
      <section id="how-it-works" className="container mx-auto px-4 sm:px-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h4 className="font-bold text-base">Midnight Train</h4>
                  <p className="text-xs text-muted-foreground">Thriller • Feature Film</p>
                </div>
                <Badge variant="default" className="text-xs">In Progress</Badge>
              </div>
              <p className="text-xs text-muted-foreground italic">
                &ldquo;A detective travels through a series of mysterious events on a phantom train that appears only at midnight.&rdquo;
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-muted/60">
                  <p className="font-bold text-sm">112</p>
                  <p className="text-[10px] text-muted-foreground">Pages</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/60">
                  <p className="font-bold text-sm">24</p>
                  <p className="text-[10px] text-muted-foreground">Scenes</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/60">
                  <p className="font-bold text-sm">2,646</p>
                  <p className="text-[10px] text-muted-foreground">Words</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <LayoutTemplate className="h-4 w-4" />
              <span>Film Workspace</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              All your screenplay details in one cohesive hub.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Keep your loglines, genres, screenplay stats, and personal activity timeline centralized. Everything you need to stay organized from page one to the final draft.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Export Showcase */}
      <section className="container mx-auto px-4 sm:px-8 max-w-6xl">
        <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-12 text-center space-y-8">
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Download className="h-4 w-4" />
              <span>Export Anywhere</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Production-ready export in seconds.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Deliver your script directly to producers, directors, and readers in their preferred format.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2">
            <div className="p-5 rounded-xl border border-border bg-background space-y-2 text-left">
              <Printer className="h-5 w-5 text-primary mb-2" />
              <h3 className="font-semibold text-sm">Industry PDF</h3>
              <p className="text-xs text-muted-foreground">
                Formatted with precise 8.5&quot; x 11&quot; margins and title pages.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-background space-y-2 text-left">
              <FileCode className="h-5 w-5 text-primary mb-2" />
              <h3 className="font-semibold text-sm">Fountain (.fountain)</h3>
              <p className="text-xs text-muted-foreground">
                Plain-text markup compatible with all screenwriting software.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-background space-y-2 text-left">
              <FileText className="h-5 w-5 text-primary mb-2" />
              <h3 className="font-semibold text-sm">Plain Text (.txt)</h3>
              <p className="text-xs text-muted-foreground">
                Clean text backup with authentic dialogue spacing.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
