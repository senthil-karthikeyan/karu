"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Heading,
  AlignLeft,
  User,
  MessageSquare,
  ArrowRight,
  Camera,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Undo,
  Redo,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getActiveScreenplayType } from "./screenplay-extensions";
import type { ScreenplayElementType } from "@/types/screenplay";

interface ScreenplayToolbarProps {
  editor: Editor | null;
  onSetElementType: (type: ScreenplayElementType) => void;
  zenMode?: boolean;
  onToggleZenMode?: () => void;
}

export function ScreenplayToolbar({
  editor,
  onSetElementType,
  zenMode = false,
  onToggleZenMode,
}: ScreenplayToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  if (!editor) return null;

  const activeType = getActiveScreenplayType(editor);

  // Search logic across editor text
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      return;
    }

    const text = editor.getText();
    const matches: number[] = [];
    let pos = 0;
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();

    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
      matches.push(pos);
      pos += lowerQuery.length;
    }

    setTotalMatches(matches.length);
    if (matches.length > 0) {
      setCurrentMatchIndex(1);
      jumpToMatch(matches[0], query.length);
    } else {
      setCurrentMatchIndex(0);
    }
  };

  const jumpToMatch = (startChar: number, length: number) => {
    // Traverse ProseMirror document to resolve text position
    let currentPos = 0;
    let found = false;

    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.isText && node.text) {
        const textLen = node.text.length;
        if (currentPos + textLen > startChar) {
          const offsetInNode = startChar - currentPos;
          const from = pos + offsetInNode;
          const to = from + length;
          editor.commands.setTextSelection({ from, to });
          editor.commands.scrollIntoView();
          found = true;
          return false;
        }
        currentPos += textLen;
      }
    });
  };

  const nextMatch = () => {
    if (totalMatches === 0 || !searchQuery) return;
    const nextIdx = currentMatchIndex >= totalMatches ? 1 : currentMatchIndex + 1;
    setCurrentMatchIndex(nextIdx);

    const text = editor.getText();
    const lowerQuery = searchQuery.toLowerCase();
    const lowerText = text.toLowerCase();
    let pos = 0;
    let count = 0;
    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
      count++;
      if (count === nextIdx) {
        jumpToMatch(pos, searchQuery.length);
        break;
      }
      pos += lowerQuery.length;
    }
  };

  const prevMatch = () => {
    if (totalMatches === 0 || !searchQuery) return;
    const prevIdx = currentMatchIndex <= 1 ? totalMatches : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIdx);

    const text = editor.getText();
    const lowerQuery = searchQuery.toLowerCase();
    const lowerText = text.toLowerCase();
    let pos = 0;
    let count = 0;
    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
      count++;
      if (count === prevIdx) {
        jumpToMatch(pos, searchQuery.length);
        break;
      }
      pos += lowerQuery.length;
    }
  };

  return (
    <div className="flex flex-col border-b border-border bg-muted/40 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-2">
        {/* Screenplay Element Format Selector */}
        <div className="flex items-center gap-1.5">
          {/* Mobile / Compact Dropdown Selector */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-7 text-xs px-2.5 gap-1.5 capitalize font-medium" />}>
                {activeType === "scene-heading" && <Heading className="h-3.5 w-3.5 text-amber-500" />}
                {activeType === "action" && <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                {activeType === "character" && <User className="h-3.5 w-3.5 text-blue-500" />}
                {activeType === "dialogue" && <MessageSquare className="h-3.5 w-3.5 text-purple-500" />}
                {activeType === "parenthetical" && <span className="font-mono text-xs">( )</span>}
                {activeType === "transition" && <ArrowRight className="h-3.5 w-3.5 text-rose-500" />}
                {activeType === "shot" && <Camera className="h-3.5 w-3.5 text-cyan-500" />}
                <span>{activeType.replace("-", " ")}</span>
                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-44">
                <DropdownMenuItem onClick={() => onSetElementType("scene-heading")}>
                  <Heading className="h-3.5 w-3.5 text-amber-500 mr-2" />
                  <span>Scene Heading</span>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌥1</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetElementType("action")}>
                  <AlignLeft className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                  <span>Action</span>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌥2</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetElementType("character")}>
                  <User className="h-3.5 w-3.5 text-blue-500 mr-2" />
                  <span>Character</span>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌥3</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetElementType("dialogue")}>
                  <MessageSquare className="h-3.5 w-3.5 text-purple-500 mr-2" />
                  <span>Dialogue</span>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌥4</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetElementType("parenthetical")}>
                  <span className="font-mono text-xs mr-2">( )</span>
                  <span>Parenthetical</span>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌥5</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetElementType("transition")}>
                  <ArrowRight className="h-3.5 w-3.5 text-rose-500 mr-2" />
                  <span>Transition</span>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌥6</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetElementType("shot")}>
                  <Camera className="h-3.5 w-3.5 text-cyan-500 mr-2" />
                  <span>Shot</span>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌥7</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Full Segmented Element Selector */}
          <div className="hidden lg:flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mr-1.5 hidden xl:inline">
              Format:
            </span>

            {/* Scene Heading */}
            <Button
              type="button"
              variant={activeType === "scene-heading" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={() => onSetElementType("scene-heading")}
              title="Scene Heading (Mod+Alt+1)"
            >
              <Heading className="h-3.5 w-3.5" />
              <span>Scene Heading</span>
            </Button>

            {/* Action */}
            <Button
              type="button"
              variant={activeType === "action" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={() => onSetElementType("action")}
              title="Action (Mod+Alt+2)"
            >
              <AlignLeft className="h-3.5 w-3.5" />
              <span>Action</span>
            </Button>

            {/* Character */}
            <Button
              type="button"
              variant={activeType === "character" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={() => onSetElementType("character")}
              title="Character (Mod+Alt+3 / Tab from Action)"
            >
              <User className="h-3.5 w-3.5" />
              <span>Character</span>
            </Button>

            {/* Dialogue */}
            <Button
              type="button"
              variant={activeType === "dialogue" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={() => onSetElementType("dialogue")}
              title="Dialogue (Mod+Alt+4 / Enter from Character)"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Dialogue</span>
            </Button>

            {/* Parenthetical */}
            <Button
              type="button"
              variant={activeType === "parenthetical" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={() => onSetElementType("parenthetical")}
              title="Parenthetical (Mod+Alt+5 / Tab from Dialogue)"
            >
              <span className="font-mono text-xs">( )</span>
              <span>Parenthetical</span>
            </Button>

            {/* Transition */}
            <Button
              type="button"
              variant={activeType === "transition" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={() => onSetElementType("transition")}
              title="Transition (Mod+Alt+6)"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>Transition</span>
            </Button>

            {/* Shot */}
            <Button
              type="button"
              variant={activeType === "shot" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={() => onSetElementType("shot")}
              title="Shot (Mod+Alt+7)"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Shot</span>
            </Button>
          </div>
        </div>

        {/* Inline Styles, Search & Zen Mode */}
        <div className="flex items-center gap-1">
          {/* Find in Script Toggle */}
          <Button
            type="button"
            variant={searchOpen ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs gap-1.5"
            onClick={() => setSearchOpen(!searchOpen)}
            title="Find in screenplay (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Find</span>
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5 hidden sm:block" />

          <Button
            type="button"
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive("underline") ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive("strike") ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-3.5 w-3.5" />
          </Button>

          {onToggleZenMode && (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <Button
                type="button"
                variant={zenMode ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onToggleZenMode}
                title={zenMode ? "Exit Focus Mode" : "Enter Focus Mode"}
              >
                {zenMode ? <Minimize2 className="h-3.5 w-3.5 text-primary" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Inline Search Bar */}
      {searchOpen && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-background border-t border-border animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              placeholder="Find in screenplay..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.shiftKey) {
                    prevMatch();
                  } else {
                    nextMatch();
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setSearchOpen(false);
                  setSearchQuery("");
                  setTotalMatches(0);
                  editor.commands.focus();
                }
              }}
              className="h-7 text-xs bg-transparent border-0 focus-visible:ring-0 px-0"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {searchQuery && (
              <span>
                {totalMatches > 0 ? `${currentMatchIndex} of ${totalMatches}` : "No matches"}
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={prevMatch}
              disabled={totalMatches === 0}
              title="Previous Match"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={nextMatch}
              disabled={totalMatches === 0}
              title="Next Match"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                setTotalMatches(0);
              }}
              title="Close Search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
