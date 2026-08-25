"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, FileCode, Printer, Check } from "lucide-react";
import type { ExportFormat, ExportOptions, Project } from "@/types/screenplay";
import { exportScreenplay } from "@/lib/export-utils";
import { useProjectStore } from "@/stores/project-store";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ExportModalProps {
  project: Project;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ExportModal({
  project,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: ExportModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const addActivity = useProjectStore((state) => state.addActivity);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [includeSceneNumbers, setIncludeSceneNumbers] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        format,
        includeTitlePage,
        includePageNumbers,
        includeSceneNumbers,
      };

      exportScreenplay(project, options);

      addActivity({
        projectId: project.id,
        type: "exported",
        title: `Screenplay exported to ${format.toUpperCase()}`,
        description: `Exported ${project.stats.pageCount} pages formatted for ${format.toUpperCase()}.`,
        metadata: { format: format.toUpperCase() },
      });

      toast.success(`Screenplay exported as ${format.toUpperCase()}`, {
        description: `Draft "${project.title}" was prepared successfully.`,
      });

      setOpen(false);
    } catch {
      toast.error("Failed to export screenplay");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 font-semibold">
            <Download className="h-5 w-5 text-primary" />
            Export Screenplay
          </DialogTitle>
          <DialogDescription>
            Choose industry-standard format and formatting options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Format selection cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Export Format
            </Label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* PDF */}
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all relative ${
                  format === "pdf"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Printer className="h-5 w-5 text-primary" />
                  {format === "pdf" && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <span className="font-semibold text-sm">PDF</span>
                <span className="text-[11px] text-muted-foreground">Print ready</span>
              </button>

              {/* Fountain */}
              <button
                type="button"
                onClick={() => setFormat("fountain")}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all relative ${
                  format === "fountain"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <FileCode className="h-5 w-5 text-primary" />
                  {format === "fountain" && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <span className="font-semibold text-sm">Fountain</span>
                <span className="text-[11px] text-muted-foreground">.fountain plain text</span>
              </button>

              {/* TXT */}
              <button
                type="button"
                onClick={() => setFormat("txt")}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all relative ${
                  format === "txt"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <FileText className="h-5 w-5 text-primary" />
                  {format === "txt" && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <span className="font-semibold text-sm">Plain Text</span>
                <span className="text-[11px] text-muted-foreground">Standard .txt</span>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Document Options
            </Label>
            <div className="space-y-2.5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTitlePage"
                  checked={includeTitlePage}
                  onCheckedChange={(checked) => setIncludeTitlePage(!!checked)}
                />
                <Label htmlFor="includeTitlePage" className="text-xs font-medium cursor-pointer">
                  Include Title Page (Author, draft date)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePageNumbers"
                  checked={includePageNumbers}
                  onCheckedChange={(checked) => setIncludePageNumbers(!!checked)}
                />
                <Label htmlFor="includePageNumbers" className="text-xs font-medium cursor-pointer">
                  Include Header Page Numbers (e.g. 2.)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSceneNumbers"
                  checked={includeSceneNumbers}
                  onCheckedChange={(checked) => setIncludeSceneNumbers(!!checked)}
                />
                <Label htmlFor="includeSceneNumbers" className="text-xs font-medium cursor-pointer">
                  Include Scene Numbering
                </Label>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
            <span>Current script size:</span>
            <span className="font-medium text-foreground">{project.stats.pageCount} Pages • {project.stats.wordCount.toLocaleString()} Words</span>
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            Download {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
