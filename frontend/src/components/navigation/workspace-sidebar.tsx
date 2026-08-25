"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutTemplate,
  FileText,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import type { Project } from "@/types/screenplay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkspaceSidebarProps {
  project: Project;
  activeTab?: "overview" | "activity" | "settings";
  onTabChange?: (tab: "overview" | "activity" | "settings") => void;
}

export function WorkspaceSidebar({
  project,
  activeTab = "overview",
  onTabChange,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isEditorPage = pathname.endsWith("/editor");

  return (
    <aside
      className={cn(
        "border-r border-border bg-sidebar shrink-0 flex flex-col justify-between transition-all duration-200 z-20",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex flex-col gap-4 p-3">
        {/* Back to Dashboard Link */}
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 px-2",
              collapsed && "justify-center px-0"
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span className="ml-2 font-medium">All Projects</span>}
          </Button>
        </Link>

        {/* Project Header Info */}
        <div
          className={cn(
            "px-2 py-1 border-b border-border/60 pb-3",
            collapsed && "text-center px-0"
          )}
        >
          {!collapsed ? (
            <div>
              <h2 className="font-semibold text-sm tracking-tight text-foreground truncate">
                {project.title}
              </h2>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                {project.genre} • {project.format}
              </p>
            </div>
          ) : (
            <div className="h-8 w-8 mx-auto rounded bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
              {project.title[0]}
            </div>
          )}
        </div>

        {/* Navigation Items - strictly MVP only */}
        <nav className="space-y-1">
          {/* 1. Overview */}
          <Link
            href={`/projects/${project.id}`}
            onClick={() => onTabChange?.("overview")}
            className={cn(
              "flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
              pathname === `/projects/${project.id}` && activeTab === "overview"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
            title="Overview"
          >
            <LayoutTemplate className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Overview</span>}
          </Link>

          {/* 2. Screenplay */}
          <Link
            href={`/projects/${project.id}/editor`}
            className={cn(
              "flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
              isEditorPage
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
            title="Screenplay Editor"
          >
            <FileText className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Screenplay</span>}
          </Link>

          {/* 3. Activity */}
          <button
            type="button"
            onClick={() => onTabChange?.("activity")}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left",
              pathname === `/projects/${project.id}` && activeTab === "activity"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
            title="Activity Timeline"
          >
            <History className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Activity</span>}
          </button>

          {/* 4. Settings */}
          <button
            type="button"
            onClick={() => onTabChange?.("settings")}
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left",
              pathname === `/projects/${project.id}` && activeTab === "settings"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
            title="Project Settings"
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </button>
        </nav>
      </div>

      {/* Collapse Footer */}
      <div className="p-3 border-t border-border/60">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full text-xs text-muted-foreground hover:text-foreground h-8",
            collapsed ? "justify-center px-0" : "justify-start px-2"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
