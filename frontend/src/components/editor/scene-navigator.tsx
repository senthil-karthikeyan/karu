"use client";

import { useState } from "react";
import { Search, Clock, ChevronRight } from "lucide-react";
import type { SceneItem } from "@/types/screenplay";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SceneNavigatorProps {
  scenes: SceneItem[];
  activeSceneId?: string;
  onSelectScene: (scene: SceneItem) => void;
  className?: string;
}

export function SceneNavigator({
  scenes,
  activeSceneId,
  onSelectScene,
  className,
}: SceneNavigatorProps) {
  const [search, setSearch] = useState("");

  const filteredScenes = scenes.filter((s) =>
    s.slugline.toLowerCase().includes(search.toLowerCase()) ||
    s.summary?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("w-72 border-r border-border bg-sidebar shrink-0 flex flex-col h-full", className)}>
      {/* Header & Search */}
      <div className="p-3 border-b border-border/60 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Scenes ({scenes.length})
          </span>
          <Badge variant="outline" className="text-[10px]">
            Navigation
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search scenes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Scenes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredScenes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No scenes match &quot;{search}&quot;
          </p>
        ) : (
          filteredScenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSelectScene(scene)}
              className={cn(
                "w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start gap-2.5 group",
                activeSceneId === scene.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "hover:bg-muted/70 text-foreground"
              )}
            >
              <span
                className={cn(
                  "font-mono font-bold text-[11px] shrink-0 mt-0.5",
                  activeSceneId === scene.id ? "text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {scene.number}.
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold tracking-tight uppercase text-[11px]">
                  {scene.slugline}
                </p>
                {scene.summary && (
                  <p
                    className={cn(
                      "text-[10px] line-clamp-1 mt-0.5",
                      activeSceneId === scene.id ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {scene.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className="flex items-center gap-0.5 opacity-70">
                    <Clock className="h-2.5 w-2.5" />
                    {scene.time}
                  </span>
                  {scene.pageNumber && (
                    <span className="opacity-70">
                      p. {scene.pageNumber}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 mt-1",
                  activeSceneId === scene.id ? "opacity-100" : "opacity-30"
                )}
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
