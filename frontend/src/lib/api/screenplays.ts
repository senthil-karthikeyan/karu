import { apiClient } from "./client";

export interface ScreenplayResponse {
  id: string;
  projectId: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreenplayDetailResponse extends ScreenplayResponse {
  content: string;
  revision: number;
}

export interface ScreenplayContentResponse {
  screenplayId: string;
  content: string;
  revision: number;
  updatedAt: string;
}

export interface ScreenplayVersionResponse {
  id: string;
  screenplayId: string;
  versionNumber: number;
  title: string;
  content: string;
  createdBy?: string;
  createdAt: string;
}

export interface RestoreVersionResponse {
  screenplayId: string;
  restoredFromId: string;
  newRevision: number;
  content: string;
  restoreVersion: ScreenplayVersionResponse;
}

export interface CreateScreenplayRequest {
  title: string;
  description?: string;
}

export interface UpdateScreenplayRequest {
  title?: string;
  description?: string;
}

export interface SaveContentRequest {
  content: string;
  revision: number;
}

export interface CreateVersionRequest {
  title: string;
  content?: string;
}

export const screenplaysApi = {
  async listScreenplays(projectId: string): Promise<ScreenplayResponse[]> {
    const data = await apiClient<ScreenplayResponse[]>(`/projects/${projectId}/screenplays`);
    return data || [];
  },

  async createScreenplay(
    projectId: string,
    data: CreateScreenplayRequest
  ): Promise<ScreenplayDetailResponse> {
    return apiClient<ScreenplayDetailResponse>(`/projects/${projectId}/screenplays`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getScreenplay(id: string): Promise<ScreenplayDetailResponse> {
    return apiClient<ScreenplayDetailResponse>(`/screenplays/${id}`);
  },

  async updateScreenplay(
    id: string,
    data: UpdateScreenplayRequest
  ): Promise<ScreenplayResponse> {
    return apiClient<ScreenplayResponse>(`/screenplays/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteScreenplay(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/screenplays/${id}`, {
      method: "DELETE",
    });
  },

  async getContent(id: string): Promise<ScreenplayContentResponse> {
    return apiClient<ScreenplayContentResponse>(`/screenplays/${id}/content`);
  },

  async saveContent(
    id: string,
    data: SaveContentRequest
  ): Promise<ScreenplayContentResponse> {
    return apiClient<ScreenplayContentResponse>(`/screenplays/${id}/content`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async listVersions(id: string): Promise<ScreenplayVersionResponse[]> {
    const data = await apiClient<ScreenplayVersionResponse[]>(`/screenplays/${id}/versions`);
    return data || [];
  },

  async createVersion(
    id: string,
    data: CreateVersionRequest
  ): Promise<ScreenplayVersionResponse> {
    return apiClient<ScreenplayVersionResponse>(`/screenplays/${id}/versions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getVersion(id: string, versionId: string): Promise<ScreenplayVersionResponse> {
    return apiClient<ScreenplayVersionResponse>(`/screenplays/${id}/versions/${versionId}`);
  },

  async restoreVersion(id: string, versionId: string): Promise<RestoreVersionResponse> {
    return apiClient<RestoreVersionResponse>(
      `/screenplays/${id}/versions/${versionId}/restore`,
      {
        method: "POST",
      }
    );
  },
};
