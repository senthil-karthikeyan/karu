"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useProjectDetailQuery, useActivitiesQuery } from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { MainNav } from "@/components/navigation/main-nav";
import { WorkspaceSidebar } from "@/components/navigation/workspace-sidebar";
import { ProjectOverview } from "@/components/workspace/project-overview";
import { ProjectActivity } from "@/components/workspace/project-activity";
import { ProjectSettings } from "@/components/workspace/project-settings";
import { ExportModal } from "@/components/editor/export-modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project, ActivityItem, SceneItem } from "@/types/screenplay";

interface ProjectWorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectWorkspacePage({ params }: ProjectWorkspacePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth({ requireAuth: true });

  const {
    data: rawProject,
    isLoading: isProjectLoading,
  } = useProjectDetailQuery(id);

  const { data: rawActivities = [] } = useActivitiesQuery(id);

  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "settings">("overview");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  if (isAuthLoading || !isAuthenticated) {
    return null;
  }

  if (isProjectLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MainNav />
        <div className="flex-1 flex overflow-hidden">
          <div className="w-60 border-r border-border p-4 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <main className="flex-1 p-8 space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-12 gap-6">
              <Skeleton className="col-span-8 h-64 rounded-xl" />
              <Skeleton className="col-span-4 h-64 rounded-xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!rawProject) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <MainNav />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">Project Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The film project you requested does not exist or may have been deleted.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-xs text-primary underline"
          >
            Return to Dashboard
          </button>
        </div>
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

  const activities: ActivityItem[] = rawActivities.map((a) => ({
    id: a.id,
    projectId: a.projectId,
    type: a.type as ActivityItem["type"],
    title: a.title,
    description: a.description,
    timestamp: a.timestamp,
    metadata: a.metadata as ActivityItem["metadata"],
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav />

      <div className="flex-1 flex overflow-hidden">
        {/* Workspace Sidebar */}
        <WorkspaceSidebar
          project={project}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-muted/20">
          {activeTab === "overview" && (
            <ProjectOverview
              project={project}
              activities={activities}
              onOpenExport={() => setExportModalOpen(true)}
              onViewAllActivity={() => setActiveTab("activity")}
            />
          )}

          {activeTab === "activity" && (
            <ProjectActivity activities={activities} />
          )}

          {activeTab === "settings" && (
            <ProjectSettings project={project} />
          )}
        </main>
      </div>

      {/* Export Dialog */}
      <ExportModal
        project={project}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </div>
  );
}
