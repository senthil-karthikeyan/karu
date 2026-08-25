"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Project } from "@/types/screenplay";
import { ExportModal } from "@/components/editor/export-modal";
import { paginateScreenplayHtml } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScreenplayPreviewViewProps {
  project: Project;
}

export function ScreenplayPreviewView({ project }: ScreenplayPreviewViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Split screenplay content into accurate physical pages
  const pages = useMemo(() => {
    return paginateScreenplayHtml(project.screenplayContent, 840);
  }, [project.screenplayContent]);

  const totalPages = Math.max(1, pages.length);
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const activePageHtml = pages[activePage - 1] || "";

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* Top Preview Control Bar */}
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 shrink-0 z-30 no-print">
        {/* Left: Back to Editor & Title */}
        <div className="flex items-center gap-3">
          <Link href={`/projects/${project.id}/editor`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium h-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Editor</span>
            </Button>
          </Link>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight truncate max-w-[180px] sm:max-w-xs">
              {project.title}
            </span>
            <span className="text-muted-foreground text-xs">&gt;</span>
            <Badge variant="secondary" className="text-xs">
              Page {activePage} of {totalPages}
            </Badge>
          </div>
        </div>

        {/* Center: Page Selection & Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={activePage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span>Page</span>
            <Select
              value={String(activePage)}
              onValueChange={(val) => setCurrentPage(Number(val))}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue placeholder={String(activePage)} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">of {totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={activePage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Zoom, Fullscreen, Print, Export */}
        <div className="flex items-center gap-2">
          {/* Zoom Selector */}
          <Select
            value={String(zoomLevel)}
            onValueChange={(val) => setZoomLevel(Number(val))}
          >
            <SelectTrigger className="h-8 w-20 text-xs hidden sm:flex">
              <SelectValue placeholder={`${zoomLevel}%`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="75">75%</SelectItem>
              <SelectItem value="100">100%</SelectItem>
              <SelectItem value="125">125%</SelectItem>
              <SelectItem value="150">150%</SelectItem>
            </SelectContent>
          </Select>

          {/* Fullscreen */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hidden md:flex"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          {/* Print */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs gap-1.5"
            title="Print Screenplay"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>

          {/* Export */}
          <Button
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </header>

      {/* Main Preview Reading Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center relative">
        {/* Previous Page Float Button */}
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={activePage <= 1}
          className="absolute left-6 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-transform hover:scale-105 z-20 no-print"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Next Page Float Button */}
        <button
          type="button"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={activePage >= totalPages}
          className="absolute right-6 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-transform hover:scale-105 z-20 no-print"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Screenplay Page Container with Zoom */}
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center top" }}
          className="transition-transform duration-200"
        >
          {/* Active Screenplay Physical Page */}
          <div className="w-[820px] min-h-[1056px] bg-white text-black p-12 sm:p-16 shadow-xl rounded-sm border border-neutral-300 relative font-screenplay select-text text-[15px] leading-relaxed screenplay-paper flex flex-col justify-between">
            <div>
              {/* Top Page Header */}
              <div className="flex justify-between items-center text-[11px] text-neutral-500 mb-8 border-b border-neutral-200/80 pb-3 font-screenplay select-none">
                <span>{project.title.toUpperCase()}</span>
                <span>{activePage === 1 ? "Page 1." : `${activePage}.`}</span>
              </div>

              {/* Page Content Slice */}
              <div
                className="space-y-4"
                dangerouslySetInnerHTML={{ __html: activePageHtml }}
              />
            </div>

            {/* Bottom Margin area */}
            <div className="pt-8 text-right text-[10px] text-neutral-400 font-mono select-none">
              <span>Page {activePage} of {totalPages}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Page Strip Thumbnails */}
      <footer className="h-16 border-t border-border bg-background/95 px-4 flex items-center justify-center gap-2 overflow-x-auto shrink-0 no-print">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setCurrentPage(p)}
            className={cn(
              "h-11 w-8 rounded-xs border text-[10px] flex items-center justify-center font-mono transition-all shrink-0",
              activePage === p
                ? "border-primary bg-primary text-primary-foreground font-bold ring-2 ring-primary/20 scale-105"
                : "border-border bg-muted/40 hover:bg-muted text-muted-foreground"
            )}
          >
            {p}
          </button>
        ))}
      </footer>

      {/* Export Dialog */}
      <ExportModal
        project={project}
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </div>
  );
}
