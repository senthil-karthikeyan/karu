"use client";

import Link from "next/link";
import {
  FileText,
  Eye,
  Download,
  Play,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { Project, ActivityItem } from "@/types/screenplay";
import { formatRelativeTime, formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EncryptionBadge } from "@/components/crypto/encryption-badge";
import { useDefaultScreenplayQuery } from "@/hooks/use-projects";

interface ProjectOverviewProps {
  project: Project;
  activities: ActivityItem[];
  onOpenExport: () => void;
  onViewAllActivity: () => void;
}

export function ProjectOverview({
  project,
  activities,
  onOpenExport,
  onViewAllActivity,
}: ProjectOverviewProps) {
  const { data: defaultScreenplay } = useDefaultScreenplayQuery(project.id);
  const recentActivities = activities.slice(0, 3);

  const wordCount = defaultScreenplay?.wordCount ?? 0;
  const pageCount = defaultScreenplay?.pageCount ?? 1;
  const sceneCount = defaultScreenplay?.sceneCount ?? 1;
  const screenplayTitle = defaultScreenplay?.title || "Default Screenplay";

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Hero Project Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="text-xs font-semibold">
              {project.status}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {project.genre}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {project.format}
            </Badge>
            <EncryptionBadge screenplayId={project.id} />
            <span className="text-xs text-muted-foreground ml-1">
              Updated {formatRelativeTime(project.updatedAt)}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {project.title}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed mt-1.5 max-w-2xl">
              {project.logline}
            </p>
          </div>
        </div>

        {/* Project Poster */}
        {project.coverImage && (
          <div className="relative aspect-video w-full md:w-56 rounded-lg overflow-hidden border border-border shadow-xs shrink-0">
            <img
              src={project.coverImage}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Main Grid: Continue Writing & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Continue Writing Card */}
        <div className="md:col-span-8 space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/30">
            <CardHeader className="pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Continue Writing
              </span>
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                <span>{screenplayTitle}</span>
              </CardTitle>
              <CardDescription>
                Pick up right where you left off. {wordCount.toLocaleString()} words drafted across {pageCount} pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href={`/projects/${project.id}/editor`}>
                <Button size="lg" className="gap-2 font-medium w-full sm:w-auto shadow-xs">
                  <Play className="h-4 w-4 fill-current" />
                  Continue Screenplay
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                <CardDescription>Latest updates to this project</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAllActivity}
                className="text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentActivities.map((act) => (
                    <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground">{act.title}</p>
                        <p className="text-muted-foreground text-[11px]">{act.description}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(act.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick Actions & Stats */}
        <div className="md:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              <CardDescription>Screenplay workflow shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/projects/${project.id}/editor`} className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-9 gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Open Screenplay Editor</span>
                </Button>
              </Link>

              <Link href={`/projects/${project.id}/preview`} className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-9 gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span>Preview Screenplay (PDF Layout)</span>
                </Button>
              </Link>

              <Button
                variant="outline"
                onClick={onOpenExport}
                className="w-full justify-start text-xs h-9 gap-2"
              >
                <Download className="h-4 w-4 text-primary" />
                <span>Export Screenplay</span>
              </Button>
            </CardContent>
          </Card>

          {/* Script Stats Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Screenplay Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Page Count:</span>
                <span className="font-semibold">{pageCount} Pages</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Word Count:</span>
                <span className="font-semibold">{wordCount.toLocaleString()} Words</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Scenes:</span>
                <span className="font-semibold">{sceneCount} Scenes</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-semibold">{formatDate(project.createdAt, "MMM d, yyyy")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
