"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Film,
  Plus,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  User,
} from "lucide-react";
import { useProjectsQuery } from "@/hooks/use-projects";
import { useAuth } from "@/hooks/use-auth";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface MainNavProps {
  isPublic?: boolean;
}

export function MainNav({ isPublic = false }: MainNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: projects = [] } = useProjectsQuery();
  const { user, logout } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const displayName = user?.name || user?.email || "Writer";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // Check if we are inside a project
  const isProjectRoute = pathname.startsWith("/projects/");
  const currentProjectId = isProjectRoute ? pathname.split("/")[2] : null;
  const currentProject = projects.find((p) => p.id === currentProjectId);

  if (isPublic) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm tracking-tight transition-transform group-hover:scale-105">
              K
            </div>
            <span className="font-bold text-xl tracking-tight">karu</span>
          </Link>

          {/* Public Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#product" className="transition-colors hover:text-foreground">
              Product
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium text-sm">
                Login
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="rounded-full px-4 font-medium text-sm shadow-xs">
                Start Writing
              </Button>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // App Navigation (Authenticated / Studio)
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Left: Logo & Project context */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
                K
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:inline">karu</span>
            </Link>

            {currentProject && (
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="sm" className="gap-1.5 font-medium text-sm h-8 px-2">
                        <Film className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="max-w-[140px] truncate">{currentProject.title}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">My Projects</DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    {projects.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => router.push(`/projects/${p.id}`)}
                        className={`flex items-center justify-between text-xs ${
                          p.id === currentProject.id ? "bg-muted font-semibold" : ""
                        }`}
                      >
                        <span className="truncate">{p.title}</span>
                        <Badge variant="outline" className="text-[10px] scale-90">
                          {p.genre}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setCreateModalOpen(true)}
                      className="text-xs text-primary font-medium cursor-pointer"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Create New Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Right: Actions & User Avatar */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 text-xs font-medium h-8 rounded-md"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Project</span>
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8 border">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {initials || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal py-1.5">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-semibold">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  Profile &amp; Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    router.push("/login");
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <CreateProjectModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </>
  );
}
