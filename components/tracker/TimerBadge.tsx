"use client";

import { useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTimerStore } from "./useTimerStore";

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

export function TimerBadge() {
  const { runningTimer } = useTimerStore();
  const [elapsed, setElapsed] = useState("00:00:00");

  const startMs = useMemo(
    () => (runningTimer?.start_time ? new Date(runningTimer.start_time).getTime() : null),
    [runningTimer?.start_time],
  );

  useEffect(() => {
    if (!startMs) return;
    const tick = () => {
      const diffSeconds = (Date.now() - startMs) / 1000;
      setElapsed(formatDuration(Math.max(diffSeconds, 0)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs]);

  if (!runningTimer) return null;

  return (
    <Badge variant="secondary" className="flex items-center gap-2 rounded-full bg-primary/10 text-primary">
      <Timer className="h-4 w-4" />
      <span className="font-mono text-xs">{elapsed}</span>
      <span className="text-xs text-muted-foreground">{runningTimer.project_name || "Running"}</span>
    </Badge>
  );
}


