import { apiClient } from "./client";
import type { SceneItem } from "./scenes";

export interface ProjectStats {
  pageCount: number;
  wordCount: number;
  sceneCount: number;
}

export interface ProjectResponse {
  id: string;
  userId: string;
  title: string;
  logline: string;
  genre: string;
  format: string;
  status: string;
  synopsis: string;
  coverImage: string;
  lastEditedScene: string;
  stats: ProjectStats;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailResponse extends ProjectResponse {
  scenes?: SceneItem[];
}

export interface CreateProjectRequest {
  title: string;
  logline?: string;
  genre?: string;
  format?: string;
  status?: string;
  synopsis?: string;
  coverImage?: string;
}

export interface UpdateProjectRequest {
  title?: string;
  logline?: string;
  genre?: string;
  format?: string;
  status?: string;
  synopsis?: string;
  coverImage?: string;
  lastEditedScene?: string;
}

export const projectsApi = {
  async listProjects(): Promise<ProjectResponse[]> {
    const data = await apiClient<ProjectResponse[]>("/projects");
    return data || [];
  },

  async createProject(data: CreateProjectRequest): Promise<ProjectResponse> {
    return apiClient<ProjectResponse>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getProject(id: string): Promise<ProjectDetailResponse> {
    return apiClient<ProjectDetailResponse>(`/projects/${id}`);
  },

  async getDefaultScreenplay(id: string): Promise<any> {
    return apiClient(`/projects/${id}/screenplay`);
  },

  async updateProject(id: string, data: UpdateProjectRequest): Promise<ProjectResponse> {
    return apiClient<ProjectResponse>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/projects/${id}`, {
      method: "DELETE",
    });
  },

  async getProjectKey(id: string): Promise<{
    projectId: string;
    userId: string;
    version: number;
    algorithm: string;
    iv: string;
    wrappedKey: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient(`/projects/${id}/key`);
  },

  async setProjectKey(
    id: string,
    data: {
      version: number;
      algorithm: string;
      iv: string;
      wrappedKey: string;
    }
  ): Promise<{
    projectId: string;
    userId: string;
    version: number;
    algorithm: string;
    iv: string;
    wrappedKey: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient(`/projects/${id}/key`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
