"use client";

import { useEffect, useMemo, useState } from "react";
import { PauseCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTimerStore } from "./useTimerStore";

type RunningTimerProps = {
  onStop: () => Promise<void> | void;
  isStopping?: boolean;
};

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

export function RunningTimer({ onStop, isStopping }: RunningTimerProps) {
  const { runningTimer } = useTimerStore();
  const [elapsed, setElapsed] = useState("00:00:00");

  const startMs = useMemo(
    () => (runningTimer?.start_time ? new Date(runningTimer.start_time).getTime() : null),
    [runningTimer?.start_time],
  );

  useEffect(() => {
    if (!startMs) {
      setElapsed("00:00:00");
      return;
    }
    const tick = () => {
      const diffSeconds = (Date.now() - startMs) / 1000;
      setElapsed(formatDuration(Math.max(diffSeconds, 0)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs]);

  return (
    <Card className="flex items-center justify-between gap-4 border border-red-200/60 bg-red-50/80 p-4 dark:border-red-500/40 dark:bg-red-500/10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-red-500 dark:text-red-300">Running</p>
        <p className="text-3xl font-semibold text-foreground dark:text-white font-mono">{elapsed}</p>
        <p className="text-sm text-muted-foreground">
          {runningTimer?.project_name || "No project"}
          {runningTimer?.task_name ? ` / ${runningTimer.task_name}` : ""}
          {" · "}
          {runningTimer?.description || "No description"}
        </p>
      </div>
      <Button
        variant="destructive"
        size="lg"
        className="gap-2"
        onClick={() => onStop()}
        disabled={isStopping}
      >
        <PauseCircle className="h-5 w-5" />
        {isStopping ? "Stopping..." : "Stop"}
      </Button>
    </Card>
  );
}


