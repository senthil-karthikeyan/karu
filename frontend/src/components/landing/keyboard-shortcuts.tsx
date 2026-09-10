"use client";

import { Keyboard, Sliders, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PRIMARY_SHORTCUTS = [
  { element: "Scene Heading", mac: "⌘⌥1", win: "Ctrl+Alt+1", desc: "Create a new slugline (INT./EXT.)" },
  { element: "Action", mac: "⌘⌥2", win: "Ctrl+Alt+2", desc: "Standard narrative description" },
  { element: "Character", mac: "⌘⌥3", win: "Ctrl+Alt+3", desc: "Uppercase speaker cue" },
  { element: "Dialogue", mac: "⌘⌥4", win: "Ctrl+Alt+4", desc: "Indented character speech" },
  { element: "Parenthetical", mac: "⌘⌥5", win: "Ctrl+Alt+5", desc: "Actor delivery instruction" },
  { element: "Transition", mac: "⌘⌥7", win: "Ctrl+Alt+7", desc: "Right-aligned scene transition" },
];

const STRUCTURAL_FLOWS = [
  { key: "Tab", label: "Cycle Element", desc: "Instantly cycle the current line between Action, Character, and Dialogue." },
  { key: "Enter", label: "Contextual Return", desc: "Character automatically advances to Dialogue; Scene Heading to Action." },
  { key: "Backspace", label: "Smart Reset", desc: "Pressing backspace on an empty element resets it cleanly to Action." },
];

export function KeyboardShortcuts() {
  return (
    <section id="shortcuts" className="py-20 border-t border-border/60">
      <div className="container mx-auto px-4 sm:px-8 max-w-6xl space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Keyboard className="h-4 w-4" />
            <span>Keyboard First</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Stay in the flow of writing without reaching for the toolbar.
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Every element in Karu has a dedicated keyboard shortcut. Write full acts without lifting your hands from the keyboard.
          </p>
        </div>

        {/* Shortcuts Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Direct Element Shortcuts */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-semibold text-sm text-foreground">Direct Element Hotkeys</h3>
              <span className="text-[11px] text-muted-foreground font-mono">Platform-Aware</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRIMARY_SHORTCUTS.map((item) => (
                <div
                  key={item.element}
                  className="p-4 rounded-xl border border-border/80 bg-card hover:border-border transition-colors flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">{item.element}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <kbd className="px-2 py-1 rounded-md bg-muted border border-border/80 font-mono text-[11px] font-semibold text-foreground shadow-2xs">
                      {item.mac}
                    </kbd>
                  </div>
                </div>
              ))}
            </div>

            {/* Natural Structural Keys */}
            <div className="pt-2">
              <h3 className="font-semibold text-sm text-foreground mb-3 px-1">Structural Flow Keys</h3>
              <div className="space-y-2">
                {STRUCTURAL_FLOWS.map((flow) => (
                  <div
                    key={flow.key}
                    className="p-3.5 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <kbd className="px-2.5 py-1 rounded-md bg-card border border-border font-mono text-xs font-bold text-foreground shadow-2xs">
                        {flow.key}
                      </kbd>
                      <div>
                        <strong className="text-foreground">{flow.label}: </strong>
                        <span className="text-muted-foreground">{flow.desc}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Customization Feature Card */}
          <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl space-y-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sliders className="h-5 w-5" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">
                Fully Customizable Shortcuts
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Coming from Final Draft, Highland, or Fade In? Remap any screenplay element shortcut in Studio Settings with live key recording.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Live Conflict Detection:</strong> Prevents accidental duplicate assignments.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Platform Normalized:</strong> Automatically adapts to macOS Command (⌘) or Windows/Linux Control.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Instant Reset:</strong> Return any shortcut to default with a single click.</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs flex items-center justify-between text-muted-foreground">
              <span>Settings → Shortcuts</span>
              <Badge variant="outline" className="text-[10px] font-mono">Available Now</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
