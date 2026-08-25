"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useProjectDetailQuery } from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { ScreenplayEditor } from "@/components/editor/screenplay-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project, SceneItem } from "@/types/screenplay";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth({ requireAuth: true });

  const { data: rawProject, isLoading } = useProjectDetailQuery(id);

  if (isAuthLoading || !isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <div className="h-14 border-b border-border bg-background px-4 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="h-10 border-b border-border bg-muted/40 px-4 flex items-center gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex-1 flex justify-center p-8">
          <Skeleton className="w-[820px] h-[900px] rounded-md" />
        </div>
      </div>
    );
  }

  if (!rawProject) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 space-y-4">
        <h2 className="text-xl font-bold">Project not found</h2>
        <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const project: Project = {
    id: rawProject.id,
    title: rawProject.title,
    logline: rawProject.logline,
    genre: rawProject.genre as Project["genre"],
    format: rawProject.format as Project["format"],
    status: rawProject.status as Project["status"],
    synopsis: rawProject.synopsis,
    coverImage: rawProject.coverImage,
    lastEditedScene: rawProject.lastEditedScene,
    stats: rawProject.stats || { pageCount: 0, wordCount: 0, sceneCount: 0 },
    screenplayContent: rawProject.screenplayContent || "",
    scenes: (rawProject.scenes || []).map((s) => ({
      id: s.id,
      number: s.number,
      slugline: s.slugline,
      location: s.location,
      time: s.time as SceneItem["time"],
      summary: s.summary,
      pageNumber: s.pageNumber,
    })),
    createdAt: rawProject.createdAt,
    updatedAt: rawProject.updatedAt,
  };

  return <ScreenplayEditor project={project} />;
}
