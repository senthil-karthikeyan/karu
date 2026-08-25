"use client";

import { useState } from "react";
import { toast } from "sonner";
import { User, Shield, Sliders, Save, Check, Loader2 } from "lucide-react";
import { useUserProfileQuery, useUpdateUserProfileMutation } from "@/hooks/use-user";
import { useAuth } from "@/hooks/use-auth";
import { MainNav } from "@/components/navigation/main-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UserResponse } from "@/lib/api";

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

      {/* Security Tab */}
      <TabsContent value="security">
        <form onSubmit={handleUpdatePassword}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Security &amp; Password</CardTitle>
              <CardDescription>
                Change your password and manage session credentials.
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
