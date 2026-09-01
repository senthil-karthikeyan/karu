import { apiClient } from "./client";
import type {
  EncryptedPayload,
  TipTapDocumentJSON,
  WrappedKeyPayload,
} from "@/lib/crypto";
import {
  encryptScreenplayContent,
  decryptScreenplayContent,
  parseEncryptedPayloadString,
} from "@/lib/crypto";

export interface ScreenplayResponse {
  id: string;
  projectId: string;
  title: string;
  description: string;
  isDefault: boolean;
  sortOrder: number;
  wordCount: number;
  pageCount: number;
  sceneCount: number;
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
  isDefault?: boolean;
  sortOrder?: number;
  wordCount?: number;
  pageCount?: number;
  sceneCount?: number;
}

export interface UpdateScreenplayRequest {
  title?: string;
  description?: string;
  isDefault?: boolean;
  sortOrder?: number;
  wordCount?: number;
  pageCount?: number;
  sceneCount?: number;
}

export interface SaveContentRequest {
  content: string;
  revision: number;
  wordCount?: number;
  pageCount?: number;
  sceneCount?: number;
}

export interface SaveEncryptedContentRequest {
  encryptedContent: EncryptedPayload;
  revision: number;
  wordCount?: number;
  pageCount?: number;
  sceneCount?: number;
}

export interface CreateVersionRequest {
  title: string;
  content?: string;
}

export interface EncryptedKeyMetadata {
  screenplayId: string;
  wrappedKey: WrappedKeyPayload;
}

export const screenplaysApi = {
  async getDefaultScreenplay(projectId: string): Promise<ScreenplayDetailResponse> {
    return apiClient<ScreenplayDetailResponse>(`/projects/${projectId}/screenplay`);
  },

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

  /**
   * Client-side E2EE: Encrypts the TipTap document JSON using the provided SCK
   * and dispatches the ciphertext payload with client-calculated statistics to the backend.
   */
  async saveEncryptedContent(
    id: string,
    doc: TipTapDocumentJSON,
    key: CryptoKey,
    revision: number,
    stats?: { wordCount?: number; pageCount?: number; sceneCount?: number }
  ): Promise<ScreenplayContentResponse> {
    const encryptedPayload = await encryptScreenplayContent(doc, key);
    return apiClient<ScreenplayContentResponse>(`/screenplays/${id}/content`, {
      method: "PUT",
      body: JSON.stringify({
        content: JSON.stringify(encryptedPayload),
        revision,
        wordCount: stats?.wordCount,
        pageCount: stats?.pageCount,
        sceneCount: stats?.sceneCount,
      }),
    });
  },

  /**
   * Client-side E2EE: Fetches the encrypted payload from backend and decrypts
   * into TipTap JSON using the provided SCK.
   */
  async getDecryptedContent(
    id: string,
    key: CryptoKey
  ): Promise<{ doc: TipTapDocumentJSON; revision: number; updatedAt: string }> {
    const resp = await this.getContent(id);
    const parsedPayload = parseEncryptedPayloadString(resp.content);
    if (parsedPayload) {
      const doc = await decryptScreenplayContent(parsedPayload, key);
      return { doc, revision: resp.revision, updatedAt: resp.updatedAt };
    }

    try {
      const parsed = JSON.parse(resp.content);
      if (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).type === "doc") {
        return { doc: parsed as TipTapDocumentJSON, revision: resp.revision, updatedAt: resp.updatedAt };
      }
    } catch {
      // Plaintext or legacy format
    }

    throw new Error("Unable to decrypt screenplay: content format is unrecognized or corrupted.");
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

  /**
   * Client-side E2EE: Encrypts a version snapshot before persisting.
   */
  async createEncryptedVersion(
    id: string,
    title: string,
    doc: TipTapDocumentJSON,
    key: CryptoKey
  ): Promise<ScreenplayVersionResponse> {
    const encryptedPayload = await encryptScreenplayContent(doc, key);
    return apiClient<ScreenplayVersionResponse>(`/screenplays/${id}/versions`, {
      method: "POST",
      body: JSON.stringify({
        title,
        content: JSON.stringify(encryptedPayload),
      }),
    });
  },

  async getVersion(id: string, versionId: string): Promise<ScreenplayVersionResponse> {
    return apiClient<ScreenplayVersionResponse>(`/screenplays/${id}/versions/${versionId}`);
  },

  /**
   * Client-side E2EE: Fetches a specific version snapshot and decrypts it into TipTap JSON.
   */
  async getDecryptedVersion(
    id: string,
    versionId: string,
    key: CryptoKey
  ): Promise<{ version: ScreenplayVersionResponse; doc: TipTapDocumentJSON }> {
    const version = await this.getVersion(id, versionId);
    const parsedPayload = parseEncryptedPayloadString(version.content);
    if (parsedPayload) {
      const doc = await decryptScreenplayContent(parsedPayload, key);
      return { version, doc };
    }

    try {
      const parsed = JSON.parse(version.content);
      if (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).type === "doc") {
        return { version, doc: parsed as TipTapDocumentJSON };
      }
    } catch {
      // Plaintext fallback
    }

    throw new Error("Unable to decrypt version: content format is unrecognized or corrupted.");
  },

  async restoreVersion(id: string, versionId: string): Promise<RestoreVersionResponse> {
    return apiClient<RestoreVersionResponse>(
      `/screenplays/${id}/versions/${versionId}/restore`,
      {
        method: "POST",
      }
    );
  },

  async getScreenplayKey(id: string): Promise<WrappedKeyPayload> {
    return apiClient<WrappedKeyPayload>(`/screenplays/${id}/key`);
  },

  async setScreenplayKey(
    id: string,
    data: WrappedKeyPayload
  ): Promise<WrappedKeyPayload> {
    return apiClient<WrappedKeyPayload>(`/screenplays/${id}/key`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
