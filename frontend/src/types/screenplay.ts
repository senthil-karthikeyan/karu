export type Genre =
  | "Thriller"
  | "Sci-Fi"
  | "Drama"
  | "Action"
  | "Comedy"
  | "Horror"
  | "Romance"
  | "Mystery"
  | "Documentary"
  | "Animation";

export type ProjectFormat =
  | "Feature Film"
  | "Short Film"
  | "TV Pilot"
  | "Web Series"
  | "Stage Play";

export type ProjectStatus = "Draft" | "In Progress" | "In Review" | "Completed" | "Archived";

export interface SceneItem {
  id: string;
  number: number;
  slugline: string;
  location: string;
  time: "DAY" | "NIGHT" | "DAWN" | "DUSK" | "CONTINUOUS";
  summary?: string;
  pageNumber?: number;
}

export type ScreenplayElementType =
  | "scene-heading"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition"
  | "shot";

export interface ActivityItem {
  id: string;
  projectId: string;
  type: "created" | "edited" | "saved" | "exported" | "updated" | "archived";
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    format?: string;
    sceneNumber?: number;
    wordCount?: number;
  };
}

export interface Project {
  id: string;
  title: string;
  logline: string;
  genre: Genre;
  format: ProjectFormat;
  status: ProjectStatus;
  synopsis?: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  lastEditedScene?: string;
  stats: {
    pageCount: number;
    wordCount: number;
    sceneCount: number;
  };
  screenplayContent: string;
  scenes: SceneItem[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  preferences: {
    editorTheme: "light" | "dark" | "sepia";
    fontSize: number;
    spellCheck: boolean;
    wordWrap: boolean;
    autoSave: boolean;
  };
}

export type ExportFormat = "pdf" | "fountain" | "txt";

export interface ExportOptions {
  format: ExportFormat;
  includeTitlePage: boolean;
  includePageNumbers: boolean;
  includeSceneNumbers: boolean;
}
