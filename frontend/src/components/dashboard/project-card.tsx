"use client";

import Link from "next/link";
import { Clock, ArrowUpRight } from "lucide-react";
import type { Project } from "@/types/screenplay";
import { formatRelativeTime } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <Card className="overflow-hidden border border-border/80 bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-md h-full flex flex-col">
        {/* Poster thumbnail */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={project.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-white font-bold text-lg">
              {project.title}
            </div>
          )}

          {/* Status Badge overlay */}
          <div className="absolute top-2.5 left-2.5">
            <Badge
              variant={project.status === "Completed" ? "default" : "secondary"}
              className="text-[10px] font-semibold tracking-wider uppercase backdrop-blur-md bg-background/80 text-foreground border-border/60"
            >
              {project.status}
            </Badge>
          </div>

          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Card Body */}
        <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-base tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
                {project.title}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {project.logline}
            </p>
          </div>

          {/* Footer stats */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-medium">
              {project.genre} • {project.format}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(project.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
