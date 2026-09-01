"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Project, ActivityItem, Genre, ProjectFormat, ProjectStatus } from "@/types/screenplay";
import { INITIAL_PROJECTS, INITIAL_ACTIVITIES } from "@/lib/initial-data";

interface ProjectStore {
  projects: Project[];
  activities: ActivityItem[];
  activeProjectId: string | null;
  hasHydrated: boolean;

  // Actions
  setActiveProject: (id: string | null) => void;
  getProject: (id: string) => Project | undefined;
  getActivities: (projectId?: string) => ActivityItem[];
  
  createProject: (data: {
    title: string;
    logline: string;
    genre: Genre;
    format: ProjectFormat;
    synopsis?: string;
    coverImage?: string;
  }) => string;

  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;

  addActivity: (activity: Omit<ActivityItem, "id" | "timestamp">) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: INITIAL_PROJECTS,
      activities: INITIAL_ACTIVITIES,
      activeProjectId: "midnight-train",
      hasHydrated: false,

      setActiveProject: (id) => set({ activeProjectId: id }),

      getProject: (id) => {
        return get().projects.find((p) => p.id === id);
      },

      getActivities: (projectId) => {
        const all = get().activities;
        if (!projectId) return all;
        return all.filter((a) => a.projectId === projectId);
      },

      createProject: (data) => {
        const id = data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || `project-${Date.now()}`;

        const newProject: Project = {
          id,
          title: data.title,
          logline: data.logline,
          genre: data.genre,
          format: data.format,
          status: "Draft" as ProjectStatus,
          synopsis: data.synopsis || "",
          coverImage:
            data.coverImage ||
            "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          scenes: [
            {
              id: `sc-${Date.now()}`,
              number: 1,
              slugline: "INT. OPENING SCENE - DAY",
              location: "OPENING SCENE",
              time: "DAY",
              summary: "Opening sequence",
              pageNumber: 1,
            },
          ],
        };

        const newActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          projectId: id,
          type: "created",
          title: "Project created",
          description: `Initialized new ${data.format.toLowerCase()} project "${data.title}".`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          projects: [newProject, ...state.projects],
          activities: [newActivity, ...state.activities],
          activeProjectId: id,
        }));

        return id;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));

        get().addActivity({
          projectId: id,
          type: "updated",
          title: "Project settings updated",
          description: "Updated project metadata and configuration.",
        });
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activities: state.activities.filter((a) => a.projectId !== id),
          activeProjectId:
            state.activeProjectId === id
              ? state.projects.find((p) => p.id !== id)?.id || null
              : state.activeProjectId,
        }));
      },

      archiveProject: (id) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: (p.status === "Archived" ? "In Progress" : "Archived") as ProjectStatus,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));

        get().addActivity({
          projectId: id,
          type: "archived",
          title: "Project archive status updated",
          description: "Project visibility and status adjusted.",
        });
      },

      addActivity: (activity) => {
        const newAct: ActivityItem = {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          ...activity,
        };

        set((state) => ({
          activities: [newAct, ...state.activities],
        }));
      },

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
    }),
    {
      name: "karu_project_store",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
