import { apiClient } from "./client";

export interface SceneItem {
  id: string;
  projectId: string;
  number: number;
  slugline: string;
  location: string;
  time: string;
  summary?: string;
  pageNumber: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSceneRequest {
  number: number;
  slugline: string;
  location?: string;
  time?: string;
  summary?: string;
  pageNumber?: number;
}

export interface UpdateSceneRequest {
  number?: number;
  slugline?: string;
  location?: string;
  time?: string;
  summary?: string;
  pageNumber?: number;
}

export const scenesApi = {
  async listScenes(projectId: string): Promise<SceneItem[]> {
    const data = await apiClient<SceneItem[]>(`/projects/${projectId}/scenes`);
    return data || [];
  },

  async createScene(projectId: string, data: CreateSceneRequest): Promise<SceneItem> {
    return apiClient<SceneItem>(`/projects/${projectId}/scenes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateScene(
    projectId: string,
    sceneId: string,
    data: UpdateSceneRequest
  ): Promise<SceneItem> {
    return apiClient<SceneItem>(`/projects/${projectId}/scenes/${sceneId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteScene(projectId: string, sceneId: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/projects/${projectId}/scenes/${sceneId}`, {
      method: "DELETE",
    });
  },
};
