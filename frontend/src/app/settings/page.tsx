"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  User,
  Shield,
  Sliders,
  Save,
  Check,
  Loader2,
  Lock,
  KeyRound,
  Download,
  Keyboard,
  RotateCcw,
  AlertCircle,
  Pencil,
  X,
  Heading,
  AlignLeft,
  MessageSquare,
  ArrowRight,
  Camera,
  Volume2,
  Milestone,
} from "lucide-react";
import { useUserProfileQuery, useUpdateUserProfileMutation } from "@/hooks/use-user";
import { useAuth } from "@/hooks/use-auth";
import { useEncryptionStore } from "@/stores/encryption-store";
import { EncryptionOnboardingModal } from "@/components/crypto/encryption-onboarding-modal";
import { EncryptionDialog } from "@/components/crypto/encryption-dialog";
import { ChangePassphraseModal } from "@/components/crypto/change-passphrase-modal";
import { MainNav } from "@/components/navigation/main-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  useShortcutsStore,
  formatHotkeyForDisplay,
  type ShortcutDefinition,
} from "@/stores/screenplay-shortcuts-store";
import type { UserResponse } from "@/lib/api";

function ScreenplayShortcutsSettings() {
  const {
    definitions,
    userBindings,
    setUserBinding,
    resetUserBinding,
    resetAllBindings,
    getEffectiveHotkey,
    detectConflict,
  } = useShortcutsStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordedHotkey, setRecordedHotkey] = useState<string | null>(null);

  const primaryDefs = definitions.filter((d) => d.category === "primary");
  const secondaryDefs = definitions.filter((d) => d.category === "secondary");
  const tertiaryDefs = definitions.filter((d) => d.category === "tertiary");

  const activeConflict =
    editingId && recordedHotkey ? detectConflict(recordedHotkey, editingId) : null;

  const handleStartEditing = (id: string) => {
    setEditingId(id);
    setRecordedHotkey(getEffectiveHotkey(id));
  };

  const handleSave = (id: string) => {
    if (!recordedHotkey || activeConflict) return;
    setUserBinding(id, recordedHotkey);
    toast.success(`Updated shortcut for ${definitions.find((d) => d.id === id)?.label}!`);
    setEditingId(null);
    setRecordedHotkey(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setRecordedHotkey(null);
  };

  const handleReset = (id: string) => {
    resetUserBinding(id);
    toast.info(`Reset ${definitions.find((d) => d.id === id)?.label} shortcut to default.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      handleCancel();
      return;
    }

    if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
      return;
    }

    const parts: string[] = [];
    if (e.metaKey || e.ctrlKey) parts.push("Mod");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");

    let key = e.key;
    if (key === " ") key = "Space";
    else if (key.length === 1) key = key.toUpperCase();

    parts.push(key);
    const hotkeyString = parts.join("+");
    setRecordedHotkey(hotkeyString);
  };

  const getElementIcon = (id: string) => {
    switch (id) {
      case "scene-heading":
        return <Heading className="h-4 w-4 text-amber-500" />;
      case "action":
        return <AlignLeft className="h-4 w-4 text-muted-foreground" />;
      case "character":
        return <User className="h-4 w-4 text-blue-500" />;
      case "dialogue":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case "parenthetical":
        return <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">( )</span>;
      case "extension":
        return <Volume2 className="h-4 w-4 text-indigo-500" />;
      case "transition":
        return <ArrowRight className="h-4 w-4 text-rose-500" />;
      case "subheader":
        return <Milestone className="h-4 w-4 text-emerald-500" />;
      case "shot":
        return <Camera className="h-4 w-4 text-cyan-500" />;
      default:
        return <Keyboard className="h-4 w-4" />;
    }
  };

  const renderShortcutRow = (def: ShortcutDefinition) => {
    const isEditing = editingId === def.id;
    const effectiveHotkey = getEffectiveHotkey(def.id);
    const displayHotkey = formatHotkeyForDisplay(
      isEditing ? recordedHotkey || effectiveHotkey : effectiveHotkey
    );
    const isCustom = !!userBindings[def.id];

    return (
      <div
        key={def.id}
        className={`p-3 rounded-lg border transition-all ${
          isEditing
            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
            : "border-border hover:border-border/80 bg-card"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted/60 shrink-0">
              {getElementIcon(def.id)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none">{def.label}</p>
                {isCustom && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    Custom
                  </Badge>
                )}
              </div>
              {def.description && (
                <p className="text-xs text-muted-foreground mt-1">{def.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {isEditing ? (
              <div className="flex flex-col items-end gap-1.5">
                <div
                  tabIndex={0}
                  onKeyDown={handleKeyDown}
                  className="outline-none focus:ring-2 focus:ring-primary px-3 py-1.5 rounded-md bg-background border border-primary/50 text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer shadow-xs animate-pulse"
                >
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  <span>{displayHotkey || "Press keys..."}</span>
                </div>
                {activeConflict && (
                  <div className="flex items-center gap-1 text-[11px] text-destructive font-medium">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>Conflicts with {activeConflict.label}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs px-2 gap-1"
                    disabled={!recordedHotkey || !!activeConflict}
                    onClick={() => handleSave(def.id)}
                  >
                    <Check className="h-3 w-3" />
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 gap-1"
                    onClick={handleCancel}
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <kbd className="font-mono text-xs px-2.5 py-1 rounded-md bg-muted border border-border/80 font-semibold text-foreground shadow-xs">
                  {displayHotkey}
                </kbd>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2.5 gap-1"
                  onClick={() => handleStartEditing(def.id)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
                {isCustom && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => handleReset(def.id)}
                    title="Reset to default"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const hasCustomBindings = Object.keys(userBindings).length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-primary" />
                Screenplay Keyboard Shortcuts
              </CardTitle>
              <CardDescription>
                Customize keyboard shortcuts for fast screenplay element switching.
                Shortcuts are stored locally on your device.
              </CardDescription>
            </div>
            {hasCustomBindings && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  resetAllBindings();
                  toast.info("All shortcuts reset to defaults.");
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Primary Elements */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Primary Screenplay Elements
              </h3>
              <span className="text-[10px] text-muted-foreground/70">
                Core flow: Scene Heading, Action, Character, Dialogue
              </span>
            </div>
            <div className="grid gap-2">{primaryDefs.map(renderShortcutRow)}</div>
          </div>

          {/* Secondary Elements */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Secondary Elements
              </h3>
              <span className="text-[10px] text-muted-foreground/70">
                Modifiers: Parenthetical, Extension, Transition
              </span>
            </div>
            <div className="grid gap-2">{secondaryDefs.map(renderShortcutRow)}</div>
          </div>

          {/* Tertiary Elements */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Movement &amp; Camera
              </h3>
              <span className="text-[10px] text-muted-foreground/70">
                Within-scene location movement and camera angles
              </span>
            </div>
            <div className="grid gap-2">{tertiaryDefs.map(renderShortcutRow)}</div>
          </div>

          {/* Structural Shortcuts Reference Card */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Built-in Structural Shortcuts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-background/60 border border-border/50">
                <span className="text-muted-foreground">Cycle forward element</span>
                <kbd className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted border font-semibold">
                  Tab
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/60 border border-border/50">
                <span className="text-muted-foreground">Cycle backward element</span>
                <kbd className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted border font-semibold">
                  Shift + Tab
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/60 border border-border/50">
                <span className="text-muted-foreground">Context-aware split</span>
                <kbd className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted border font-semibold">
                  Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/60 border border-border/50">
                <span className="text-muted-foreground">Reset empty block to Action</span>
                <kbd className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted border font-semibold">
                  Backspace
                </kbd>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsFormContent({ user }: { user: UserResponse }) {
  const updateProfileMutation = useUpdateUserProfileMutation();

  const [name, setName] = useState(user.name || "");
  const [email] = useState(user.email || "");
  const [bio, setBio] = useState(user.bio || "");

  const [spellCheck, setSpellCheck] = useState(user.preferences?.spellCheck ?? true);
  const [wordWrap, setWordWrap] = useState(user.preferences?.wordWrap ?? true);
  const [autoSave, setAutoSave] = useState(user.preferences?.autoSave ?? true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const isUnlocked = useEncryptionStore((state) => state.isUnlocked);
  const userMetadata = useEncryptionStore((state) => state.userMetadata);
  const fetchUserMetadata = useEncryptionStore((state) => state.fetchUserMetadata);

  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [changePassphraseModalOpen, setChangePassphraseModalOpen] = useState(false);

  useEffect(() => {
    fetchUserMetadata().catch(() => {});
  }, [fetchUserMetadata]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        name,
        bio,
      });
      toast.success("Profile updated successfully!");
    } catch (err: unknown) {
      toast.error("Failed to update profile", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    }
  };

  const handleSavePreferences = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        preferences: {
          spellCheck,
          wordWrap,
          autoSave,
        },
      });
      toast.success("Editor preferences updated!");
    } catch (err: unknown) {
      toast.error("Failed to update preferences", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in both password fields");
      return;
    }
    toast.success("Password update requested.");
    setCurrentPassword("");
    setNewPassword("");
  };

  const initials = (name || email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="h-10">
        <TabsTrigger value="profile" className="gap-2 text-xs">
          <User className="h-3.5 w-3.5" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="preferences" className="gap-2 text-xs">
          <Sliders className="h-3.5 w-3.5" />
          Editor Preferences
        </TabsTrigger>
        <TabsTrigger value="shortcuts" className="gap-2 text-xs">
          <Keyboard className="h-3.5 w-3.5" />
          Shortcuts
        </TabsTrigger>
        <TabsTrigger value="security" className="gap-2 text-xs">
          <Shield className="h-3.5 w-3.5" />
          Security
        </TabsTrigger>
      </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile">
        <form onSubmit={handleSaveProfile}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Personal Profile</CardTitle>
              <CardDescription>
                Information used on your screenplay title pages and drafts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Avatar section */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{name || "Writer"}</p>
                  <p className="text-xs text-muted-foreground">Screenwriter / Creator</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="user-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="user-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={email}
                    disabled
                    className="opacity-70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-bio" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bio / Writer Statement
                </Label>
                <Textarea
                  id="user-bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short bio or director's statement..."
                />
              </div>
            </CardContent>

            <CardFooter className="border-t pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="text-xs gap-1.5"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Profile
              </Button>
            </CardFooter>
          </Card>
        </form>
      </TabsContent>

      {/* Preferences Tab */}
      <TabsContent value="preferences">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Writing Preferences</CardTitle>
            <CardDescription>
              Configure your TipTap screenplay editor experience.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Real-time Spell Checking</p>
                <p className="text-xs text-muted-foreground">
                  Underline potential typos and spelling mistakes in dialogue
                </p>
              </div>
              <Button
                size="sm"
                type="button"
                variant={spellCheck ? "default" : "outline"}
                onClick={() => setSpellCheck(!spellCheck)}
                className="text-xs"
              >
                {spellCheck && <Check className="h-3.5 w-3.5 mr-1" />}
                {spellCheck ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Automatic Word Wrap</p>
                <p className="text-xs text-muted-foreground">
                  Wrap long dialogue sentences according to standard script margins
                </p>
              </div>
              <Button
                size="sm"
                type="button"
                variant={wordWrap ? "default" : "outline"}
                onClick={() => setWordWrap(!wordWrap)}
                className="text-xs"
              >
                {wordWrap && <Check className="h-3.5 w-3.5 mr-1" />}
                {wordWrap ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Auto-Save Revisions</p>
                <p className="text-xs text-muted-foreground">
                  Automatically save edits to the cloud cache as you write
                </p>
              </div>
              <Button
                size="sm"
                type="button"
                variant={autoSave ? "default" : "outline"}
                onClick={() => setAutoSave(!autoSave)}
                className="text-xs"
              >
                {autoSave && <Check className="h-3.5 w-3.5 mr-1" />}
                {autoSave ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>

          <CardFooter className="border-t pt-4 flex justify-end">
            <Button
              onClick={handleSavePreferences}
              disabled={updateProfileMutation.isPending}
              className="text-xs gap-1.5"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Preferences
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      {/* Shortcuts Tab */}
      <TabsContent value="shortcuts">
        <ScreenplayShortcutsSettings />
      </TabsContent>

      {/* Security Tab */}
      <TabsContent value="security" className="space-y-6">
        {/* Screenplay Protection & Encryption Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Screenplay Protection &amp; Encryption
                </CardTitle>
                <CardDescription>
                  Your screenplays are protected with encryption. Only you can unlock and read your scripts.
                </CardDescription>
              </div>
              <div>
                {isUnlocked ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Lock className="w-3.5 h-3.5" />
                    Protected
                  </span>
                ) : userMetadata ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Lock className="w-3.5 h-3.5" />
                    Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                    <KeyRound className="w-3.5 h-3.5" />
                    Not Set Up
                  </span>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!userMetadata ? (
              <div className="p-4 rounded-lg border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Protect Your Screenplays</p>
                  <p className="text-xs text-muted-foreground">
                    Set up an encryption passphrase to ensure only you can access your screenplays.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setOnboardingModalOpen(true)}
                  className="text-xs gap-1.5 shrink-0"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Set Up Encryption
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Status overview */}
                <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Encryption Status
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {isUnlocked
                        ? "Your screenplays are protected with encryption."
                        : "Your screenplays are locked. Enter your passphrase to unlock."}
                    </p>
                  </div>
                  {!isUnlocked && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setUnlockModalOpen(true)}
                      className="text-xs gap-1.5"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Unlock Screenplays
                    </Button>
                  )}
                </div>

                {/* Encryption Passphrase row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Encryption Passphrase
                    </p>
                    <p className="text-sm font-mono tracking-widest text-muted-foreground">
                      ••••••••••••
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Used to unlock and decrypt your screenplays on your devices.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setChangePassphraseModalOpen(true)}
                    className="text-xs gap-1.5 shrink-0"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Change Encryption Passphrase
                  </Button>
                </div>

                {/* Recovery Code row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Recovery Code
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Use your recovery code if you forget your encryption passphrase.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!isUnlocked}
                    onClick={async () => {
                      try {
                        await useEncryptionStore.getState().regenerateRecoveryKit(user.email);
                        toast.success("Recovery code downloaded successfully!");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to download recovery code");
                      }
                    }}
                    className="text-xs gap-1.5 shrink-0"
                    title={!isUnlocked ? "Unlock screenplays first to download recovery code" : undefined}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Recovery Code (.txt)
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Password Section */}
        <form onSubmit={handleUpdatePassword}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Account Password</CardTitle>
              <CardDescription>
                Update your login password and account credentials.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="current-pass" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current Password
                </Label>
                <Input
                  id="current-pass"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-pass" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  New Password
                </Label>
                <Input
                  id="new-pass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </CardContent>

            <CardFooter className="border-t pt-4 flex justify-end">
              <Button type="submit" className="text-xs gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Update Password
              </Button>
            </CardFooter>
          </Card>
        </form>

        <EncryptionOnboardingModal
          open={onboardingModalOpen}
          onOpenChange={setOnboardingModalOpen}
          onSuccess={() => {
            fetchUserMetadata();
          }}
        />

        <EncryptionDialog
          open={unlockModalOpen}
          onOpenChange={setUnlockModalOpen}
          mode="unlock"
          userMetadata={userMetadata}
        />

        <ChangePassphraseModal
          open={changePassphraseModalOpen}
          onOpenChange={setChangePassphraseModalOpen}
        />
      </TabsContent>
    </Tabs>
  );
}

export default function UserSettingsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth({ requireAuth: true });
  const { data: user, isLoading: isUserLoading } = useUserProfileQuery();

  if (isAuthLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNav />

      <main className="flex-1 container mx-auto px-4 sm:px-8 py-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Account &amp; Studio Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your personal profile, editor preferences, and credentials.
          </p>
        </div>

        {isUserLoading || !user ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading settings...
          </div>
        ) : (
          <SettingsFormContent key={user.id} user={user} />
        )}
      </main>
    </div>
  );
}
