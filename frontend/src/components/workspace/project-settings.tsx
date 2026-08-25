"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, Trash2, Archive, Save, AlertTriangle } from "lucide-react";
import type { Genre, Project, ProjectFormat } from "@/types/screenplay";
import { useUpdateProjectMutation, useDeleteProjectMutation } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const GENRES: Genre[] = [
  "Thriller",
  "Sci-Fi",
  "Drama",
  "Action",
  "Comedy",
  "Horror",
  "Romance",
  "Mystery",
  "Documentary",
  "Animation",
];

const FORMATS: ProjectFormat[] = [
  "Feature Film",
  "Short Film",
  "TV Pilot",
  "Web Series",
  "Stage Play",
];

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const router = useRouter();
  const updateProjectMutation = useUpdateProjectMutation(project.id);
  const deleteProjectMutation = useDeleteProjectMutation();

  const [title, setTitle] = useState(project.title);
  const [logline, setLogline] = useState(project.logline);
  const [genre, setGenre] = useState<Genre>(project.genre);
  const [format, setFormat] = useState<ProjectFormat>(project.format);
  const [synopsis, setSynopsis] = useState(project.synopsis || "");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        data: {
          title,
          logline,
          genre,
          format,
          synopsis,
        },
      });

      toast.success("Project settings saved!");
    } catch (err: unknown) {
      toast.error("Failed to save settings", {
        description: err instanceof Error ? err.message : "Error updating project",
      });
    }
  };

  const handleArchive = async () => {
    const nextStatus = project.status === "Archived" ? "In Progress" : "Archived";
    try {
      await updateProjectMutation.mutateAsync({
        id: project.id,
        data: { status: nextStatus },
      });
      toast.success(
        nextStatus === "Archived"
          ? "Project moved to archive"
          : "Project restored to active workspace"
      );
    } catch (err: unknown) {
      toast.error("Failed to update archive status", {
        description: err instanceof Error ? err.message : "Error updating project",
      });
    }
  };

  const handleDelete = async () => {
    if (confirmInput.trim().toUpperCase() !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    try {
      await deleteProjectMutation.mutateAsync(project.id);
      toast.success(`Project "${project.title}" deleted.`);
      setDeleteDialogOpen(false);
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error("Failed to delete project", {
        description: err instanceof Error ? err.message : "Error deleting project",
      });
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto py-2">
      {/* Project Information Form */}
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Project Settings
            </CardTitle>
            <CardDescription>
              Update your film project metadata, genre, and logline.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project Name
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Logline */}
            <div className="space-y-1.5">
              <Label htmlFor="logline" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Logline
              </Label>
              <Textarea
                id="logline"
                rows={2}
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                required
              />
            </div>

            {/* Genre & Format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Genre
                </Label>
                <Select value={genre} onValueChange={(v) => setGenre(v as Genre)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Format
                </Label>
                <Select value={format} onValueChange={(v) => setFormat(v as ProjectFormat)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Synopsis */}
            <div className="space-y-1.5">
              <Label htmlFor="synopsis" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Synopsis / Context
              </Label>
              <Textarea
                id="synopsis"
                rows={3}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between items-center border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleArchive}
              disabled={updateProjectMutation.isPending}
              className="text-xs gap-1.5"
            >
              <Archive className="h-4 w-4" />
              {project.status === "Archived" ? "Unarchive Project" : "Archive Project"}
            </Button>

            <Button
              type="submit"
              disabled={updateProjectMutation.isPending}
              className="text-xs gap-1.5"
            >
              <Save className="h-4 w-4" />
              {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Danger Zone: Delete Project */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Delete Project
          </CardTitle>
          <CardDescription>
            Permanently remove this project and all its screenplay versions. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger
              render={
                <Button variant="destructive" className="text-xs font-medium gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  Delete this Project
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Delete &quot;{project.title}&quot;?
                </DialogTitle>
                <DialogDescription className="space-y-2 pt-2">
                  <p>
                    This will permanently delete the project &quot;<strong>{project.title}</strong>&quot; and all screenplay scene content.
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    To confirm, please type <strong className="text-destructive font-mono">DELETE</strong> below:
                  </p>
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                <Input
                  placeholder='Type "DELETE"'
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <DialogFooter className="border-t pt-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmInput("");
                    setDeleteDialogOpen(false);
                  }}
                  disabled={deleteProjectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={
                    confirmInput.trim().toUpperCase() !== "DELETE" ||
                    deleteProjectMutation.isPending
                  }
                >
                  {deleteProjectMutation.isPending ? "Deleting..." : "Permanently Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
