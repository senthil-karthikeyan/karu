import { apiClient } from "./client";

export interface ActivityItem {
  id: string;
  projectId: string;
  userId?: string;
  type: "created" | "edited" | "saved" | "exported" | "updated" | "archived" | string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export const activitiesApi = {
  async listActivities(projectId: string): Promise<ActivityItem[]> {
    const data = await apiClient<ActivityItem[]>(`/projects/${projectId}/activities`);
    return data || [];
  },
};
