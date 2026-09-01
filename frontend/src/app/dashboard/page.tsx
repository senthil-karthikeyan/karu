"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Film } from "lucide-react";
import { useProjectsQuery } from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { useEncryptionStore } from "@/stores/encryption-store";
import { MainNav } from "@/components/navigation/main-nav";
import { ProjectCard } from "@/components/dashboard/project-card";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { EncryptionBanner } from "@/components/crypto/encryption-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/types/screenplay";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth({ requireAuth: true });
  const { data: rawProjects = [], isLoading: isProjectsLoading } = useProjectsQuery();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchUserMetadata = useEncryptionStore((state) => state.fetchUserMetadata);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserMetadata().catch(() => {});
    }
  }, [isAuthenticated, fetchUserMetadata]);

  // If still checking auth or unauthenticated, don't render protected UI before redirect
  if (isAuthLoading || !isAuthenticated) {
    return null;
  }

  // Map ProjectResponse to frontend Project type
  const projects: Project[] = rawProjects.map((p) => ({
    id: p.id,
    title: p.title,
    logline: p.logline,
    genre: p.genre as Project["genre"],
    format: p.format as Project["format"],
    status: p.status as Project["status"],
    synopsis: p.synopsis,
    coverImage: p.coverImage,
    lastEditedScene: p.lastEditedScene,
    stats: p.stats || { pageCount: 0, wordCount: 0, sceneCount: 0 },
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(search.toLowerCase()) ||
      project.logline.toLowerCase().includes(search.toLowerCase()) ||
      project.genre.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === "all") return true;
    if (activeFilter === "in-progress") return project.status === "In Progress";
    if (activeFilter === "completed") return project.status === "Completed";
    if (activeFilter === "draft") return project.status === "Draft";

    return true;
  });

  const firstName = user?.name ? user.name.split(" ")[0] : "Writer";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav />

      <main className="flex-1 container mx-auto px-4 sm:px-8 py-8 max-w-7xl space-y-8">
        {/* Welcome Greeting Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Good morning, {firstName} ☀️
            </h1>
            <p className="text-sm text-muted-foreground">
              Let&apos;s write something amazing today. You have {projects.length} personal screenplay{projects.length === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="gap-2 font-medium shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </Button>
          </div>
        </div>

        {/* Zero-Knowledge Encryption Status & Onboarding Banner */}
        <EncryptionBanner />

        {/* Controls: Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search screenplays by title, logline, or genre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Tabs value={activeFilter} onValueChange={setActiveFilter}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-3">
                All Projects ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="text-xs px-3">
                In Progress
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs px-3">
                Completed
              </TabsTrigger>
              <TabsTrigger value="draft" className="text-xs px-3">
                Drafts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Projects Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              My Screenplays
            </h2>
          </div>

          {isProjectsLoading || isAuthLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                  <Skeleton className="h-40 w-full rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Film className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base">No screenplays found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {search
                    ? `No projects matching "${search}". Try adjusting your search query.`
                    : "You haven't created any screenplays in this category yet."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>

      <CreateProjectModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}
