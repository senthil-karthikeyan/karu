"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useProjectDetailQuery } from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { ScreenplayPreviewView } from "@/components/preview/screenplay-preview-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project, SceneItem } from "@/types/screenplay";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default function PreviewPage({ params }: PreviewPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth({ requireAuth: true });

  const { data: rawProject, isLoading } = useProjectDetailQuery(id);

  if (isAuthLoading || !isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950">
        <div className="h-14 border-b border-border bg-background px-4 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <Skeleton className="w-[800px] h-[1050px] rounded-md" />
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
    createdAt: rawProject.createdAt,
    updatedAt: rawProject.updatedAt,
  };

  return <ScreenplayPreviewView project={project} />;
}
