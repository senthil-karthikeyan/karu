"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Lock,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectsQuery, useUpdateProjectMutation } from "@/hooks/use-projects";
import { useEncryptionStore } from "@/stores/encryption-store";
import {
  parseEncryptedPayloadString,
  htmlToTipTapJson,
  encryptScreenplayContent,
  generateScreenplayContentKey,
  wrapScreenplayKeyWithPEK,
} from "@/lib/crypto";
import { projectsApi } from "@/lib/api/projects";
import { screenplaysApi } from "@/lib/api/screenplays";

export function LegacyMigrationCard() {
  const { data: projects = [], refetch } = useProjectsQuery();
  const updateProjectMutation = useUpdateProjectMutation();
  const isUnlocked = useEncryptionStore((state) => state.isUnlocked);
  const loadAndUnlockProjectKey = useEncryptionStore((state) => state.loadAndUnlockProjectKey);
  const createAndWrapProjectKey = useEncryptionStore((state) => state.createAndWrapProjectKey);

  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMigratingTitle, setCurrentMigratingTitle] = useState("");

  const handleMigrateAll = async () => {
    if (!isUnlocked) {
      toast.error("Please unlock your encryption session first.");
      return;
    }

    if (projects.length === 0) {
      toast.info("No projects found to migrate.");
      return;
    }

    setIsMigrating(true);
    setProgress(0);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < projects.length; i++) {
      const projSummary = projects[i];
      setCurrentMigratingTitle(projSummary.title);

      try {
        // Fetch full project detail to check screenplayContent
        const projDetail = await projectsApi.getProject(projSummary.id);
        const content = projDetail.screenplayContent || "";

        // Check if already encrypted
        if (parseEncryptedPayloadString(content)) {
          skippedCount++;
          setProgress(Math.round(((i + 1) / projects.length) * 100));
          continue;
        }

        // 1. Obtain or generate Project Encryption Key (PEK)
        let pek = useEncryptionStore.getState().projectKeys[projSummary.id];
        if (!pek) {
          try {
            pek = await loadAndUnlockProjectKey(projSummary.id);
          } catch {
            const created = await createAndWrapProjectKey(projSummary.id);
            pek = created.pek;
          }
        }

        // 2. Generate new Screenplay Content Key (SCK) and wrap with PEK
        const sck = await generateScreenplayContentKey();
        const wrappedKey = await wrapScreenplayKeyWithPEK(pek, sck);
        await screenplaysApi.setScreenplayKey(projSummary.id, wrappedKey);

        // Store SCK in active Zustand memory
        useEncryptionStore.getState().setScreenplayKey(projSummary.id, sck);

        // 3. Parse plaintext HTML into TipTap document structure
        const doc = htmlToTipTapJson(content);

        // 4. Encrypt document structure with SCK
        const encryptedPayload = await encryptScreenplayContent(doc, sck);

        // 5. Update backend document
        await updateProjectMutation.mutateAsync({
          id: projSummary.id,
          data: {
            screenplayContent: JSON.stringify(encryptedPayload),
          },
        });

        successCount++;
      } catch (err) {
        console.error(`Failed to migrate project "${projSummary.title}":`, err);
        failedCount++;
      }

      setProgress(Math.round(((i + 1) / projects.length) * 100));
    }

    setIsMigrating(false);
    setCurrentMigratingTitle("");
    await refetch();

    if (failedCount === 0) {
      if (successCount > 0) {
        toast.success(`Successfully migrated ${successCount} workspace(s) to 3-tier E2EE!`);
      } else {
        toast.info("All projects are already protected with Zero-Knowledge E2EE.");
      }
    } else {
      toast.warning(
        `Migrated ${successCount} workspace(s), but ${failedCount} encountered errors.`
      );
    }
  };

  if (projects.length === 0) {
    return null;
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Workspace Cryptographic Migration
          </CardTitle>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {projects.length} Total Projects
          </span>
        </div>
        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
          Upgrade existing screenplay drafts into the zero-knowledge 3-tier encryption scheme (UEK &rarr; PEK &rarr; SCK &rarr; AES-256-GCM).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isMigrating ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>Encrypting: {currentMigratingTitle}...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden border border-border/50">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Encrypt all unencrypted workspaces client-side. No plaintext is sent to the server.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleMigrateAll}
              disabled={!isUnlocked || isMigrating}
              className="text-xs gap-1.5 font-medium shadow-xs"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  Run Zero-Knowledge Migration
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
