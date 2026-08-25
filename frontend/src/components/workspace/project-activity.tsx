"use client";

import { useState } from "react";
import { History, Clock, FileText, Download, Save, Sparkles } from "lucide-react";
import type { ActivityItem } from "@/types/screenplay";
import { formatDateTime } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProjectActivityProps {
  activities: ActivityItem[];
}

export function ProjectActivity({ activities }: ProjectActivityProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredActivities = activities.filter((act) => {
    if (filter === "all") return true;
    return act.type === filter;
  });

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "created":
        return <Sparkles className="h-4 w-4 text-emerald-500" />;
      case "edited":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "saved":
        return <Save className="h-4 w-4 text-purple-500" />;
      case "exported":
        return <Download className="h-4 w-4 text-amber-500" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Project Activity Timeline
            </CardTitle>
            <CardDescription>
              Personal activity and revision history for this screenplay project.
            </CardDescription>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "All", value: "all" },
              { label: "Edits", value: "edited" },
              { label: "Saves", value: "saved" },
              { label: "Exports", value: "exported" },
              { label: "Settings", value: "updated" },
            ].map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={filter === f.value ? "default" : "outline"}
                onClick={() => setFilter(f.value)}
                className="text-xs h-7 px-2.5"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm space-y-1">
              <History className="h-8 w-8 mx-auto opacity-40 mb-2" />
              <p>No activity found matching filter &quot;{filter}&quot;.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {filteredActivities.map((act) => (
                <div key={act.id} className="relative group">
                  {/* Dot Icon */}
                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center shadow-2xs">
                    {getActivityIcon(act.type)}
                  </div>

                  <div className="space-y-1 pl-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <p className="text-sm font-semibold text-foreground">{act.title}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(act.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{act.description}</p>

                    {act.metadata?.format && (
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        Format: {act.metadata.format}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
