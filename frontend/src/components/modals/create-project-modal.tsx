"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Film, Sparkles, Image as ImageIcon } from "lucide-react";
import { useCreateProjectMutation } from "@/hooks/use-projects";
import type { Genre, ProjectFormat } from "@/types/screenplay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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

const POSTER_PRESETS = [
  {
    name: "Midnight Noir",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Cosmic Sci-Fi",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Classic Cinema",
    url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80",
  },
  {
    name: "Vintage Drama",
    url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
  },
];

interface CreateProjectModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function CreateProjectModal({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: CreateProjectModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();
  const createProjectMutation = useCreateProjectMutation();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [title, setTitle] = useState("");
  const [logline, setLogline] = useState("");
  const [genre, setGenre] = useState<Genre>("Thriller");
  const [format, setFormat] = useState<ProjectFormat>("Feature Film");
  const [synopsis, setSynopsis] = useState("");
  const [selectedPoster, setSelectedPoster] = useState(POSTER_PRESETS[0].url);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    if (!logline.trim()) {
      toast.error("Please provide a logline for your story");
      return;
    }

    try {
      const newProject = await createProjectMutation.mutateAsync({
        title: title.trim(),
        logline: logline.trim(),
        genre,
        format,
        status: "Draft",
        synopsis: synopsis.trim(),
        coverImage: selectedPoster,
      });

      toast.success("Project created successfully!", {
        description: `"${newProject.title}" workspace is ready.`,
      });

      setOpen(false);
      setTitle("");
      setLogline("");
      setSynopsis("");

      router.push(`/projects/${newProject.id}`);
    } catch (err: unknown) {
      toast.error("Failed to create project", {
        description: err instanceof Error ? err.message : "An error occurred while creating project.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 font-semibold">
            <Film className="h-5 w-5 text-primary" />
            Create New Film Project
          </DialogTitle>
          <DialogDescription>
            Set up your screenplay document and workspace details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="project-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Project Title *
            </Label>
            <Input
              id="project-title"
              placeholder="e.g. Midnight Train, Neon Horizon"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 text-base"
              required
            />
          </div>

          {/* Logline */}
          <div className="space-y-1.5">
            <Label htmlFor="project-logline" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Logline *
            </Label>
            <Textarea
              id="project-logline"
              placeholder="A one-sentence summary of the story core premise, protagonist, and conflict..."
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              rows={2}
              required
            />
          </div>

          {/* Genre & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Genre
              </Label>
              <Select value={genre} onValueChange={(val) => setGenre(val as Genre)}>
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
              <Select value={format} onValueChange={(val) => setFormat(val as ProjectFormat)}>
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

          {/* Description / Synopsis */}
          <div className="space-y-1.5">
            <Label htmlFor="project-synopsis" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Synopsis (Optional)
            </Label>
            <Textarea
              id="project-synopsis"
              placeholder="Brief narrative outline, themes, or background notes..."
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              rows={3}
            />
          </div>

          {/* Cover Poster Preset */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Cover Visual
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {POSTER_PRESETS.map((poster) => (
                <button
                  type="button"
                  key={poster.name}
                  onClick={() => setSelectedPoster(poster.url)}
                  className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all group ${
                    selectedPoster === poster.url
                      ? "border-primary ring-2 ring-primary/20 scale-102"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={poster.url}
                    alt={poster.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white p-0.5 text-center truncate">
                    {poster.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProjectMutation.isPending} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
