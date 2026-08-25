"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  projectsApi,
  scenesApi,
  activitiesApi,
  screenplaysApi,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type CreateSceneRequest,
  type UpdateSceneRequest,
  type CreateScreenplayRequest,
  type SaveContentRequest,
  type CreateVersionRequest,
} from "@/lib/api";

// ── Projects ─────────────────────────────────────────────────────────────

export function useProjectsQuery() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.listProjects(),
    staleTime: 30 * 1000,
  });
}

export function useProjectDetailQuery(projectId?: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => {
      if (!projectId) throw new Error("Project ID is required");
      return projectsApi.getProject(projectId);
    },
    enabled: !!projectId,
    staleTime: 10 * 1000,
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProjectMutation(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id?: string;
      data: UpdateProjectRequest;
    }) => {
      const targetId = id || projectId;
      if (!targetId) throw new Error("Project ID is required");
      return projectsApi.updateProject(targetId, data);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", updated.id] });
      queryClient.invalidateQueries({ queryKey: ["projects", updated.id, "activities"] });
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.removeQueries({ queryKey: ["projects", deletedId] });
    },
  });
}

// ── Scenes ───────────────────────────────────────────────────────────────

export function useScenesQuery(projectId?: string) {
  return useQuery({
    queryKey: ["projects", projectId, "scenes"],
    queryFn: () => {
      if (!projectId) throw new Error("Project ID is required");
      return scenesApi.listScenes(projectId);
    },
    enabled: !!projectId,
  });
}

export function useCreateSceneMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSceneRequest) => scenesApi.createScene(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "scenes"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "activities"] });
    },
  });
}

export function useUpdateSceneMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sceneId, data }: { sceneId: string; data: UpdateSceneRequest }) =>
      scenesApi.updateScene(projectId, sceneId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "scenes"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

export function useDeleteSceneMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sceneId: string) => scenesApi.deleteScene(projectId, sceneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "scenes"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "activities"] });
    },
  });
}

// ── Activities ───────────────────────────────────────────────────────────

export function useActivitiesQuery(projectId?: string) {
  return useQuery({
    queryKey: ["projects", projectId, "activities"],
    queryFn: () => {
      if (!projectId) throw new Error("Project ID is required");
      return activitiesApi.listActivities(projectId);
    },
    enabled: !!projectId,
    staleTime: 10 * 1000,
  });
}

// ── Screenplays & Versioning ─────────────────────────────────────────────

export function useScreenplaysQuery(projectId?: string) {
  return useQuery({
    queryKey: ["projects", projectId, "screenplays"],
    queryFn: () => {
      if (!projectId) throw new Error("Project ID is required");
      return screenplaysApi.listScreenplays(projectId);
    },
    enabled: !!projectId,
  });
}

export function useCreateScreenplayMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScreenplayRequest) =>
      screenplaysApi.createScreenplay(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "screenplays"] });
    },
  });
}

export function useScreenplayVersionsQuery(screenplayId?: string) {
  return useQuery({
    queryKey: ["screenplays", screenplayId, "versions"],
    queryFn: () => {
      if (!screenplayId) throw new Error("Screenplay ID is required");
      return screenplaysApi.listVersions(screenplayId);
    },
    enabled: !!screenplayId,
  });
}

export function useSaveScreenplayContentMutation(screenplayId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveContentRequest) =>
      screenplaysApi.saveContent(screenplayId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screenplays", screenplayId] });
      queryClient.invalidateQueries({ queryKey: ["screenplays", screenplayId, "content"] });
    },
  });
}

export function useCreateVersionMutation(screenplayId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVersionRequest) =>
      screenplaysApi.createVersion(screenplayId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screenplays", screenplayId, "versions"] });
    },
  });
}

export function useRestoreVersionMutation(screenplayId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) =>
      screenplaysApi.restoreVersion(screenplayId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screenplays", screenplayId] });
      queryClient.invalidateQueries({ queryKey: ["screenplays", screenplayId, "content"] });
      queryClient.invalidateQueries({ queryKey: ["screenplays", screenplayId, "versions"] });
    },
  });
}
