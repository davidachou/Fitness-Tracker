"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useTimerStore } from "./useTimerStore";

type RealtimeTimerProviderProps = {
  userId: string;
  children: React.ReactNode;
};

type ActiveTimerRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  description: string | null;
  start_time: string;
  time_tracker_projects?: { billable?: boolean | null; name?: string | null } | null;
} | null;

export function RealtimeTimerProvider({ userId, children }: RealtimeTimerProviderProps) {
  const { setRunningTimer, setSyncing } = useTimerStore();
  const queryClient = useQueryClient();
  const pollEntriesRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let isMounted = true;

    const mapTimer = (row: ActiveTimerRow) => {
      if (!row) return null;
      return {
        id: row.id,
        user_id: row.user_id,
        project_id: row.project_id ?? null,
        description: row.description ?? null,
        start_time: row.start_time,
        billable: row.time_tracker_projects?.billable ?? null,
        project_name: row.time_tracker_projects?.name ?? null,
      };
    };

    const loadActiveTimer = async () => {
      setSyncing(true);
      const { data, error } = await supabase
        .from("active_timers")
        .select("id, user_id, project_id, description, start_time, time_tracker_projects(name, billable)")
        .eq("user_id", userId)
        .maybeSingle();

      if (!isMounted) return;
      if (error) {
        console.error("Active timer fetch failed", error);
      }
      setRunningTimer(mapTimer(data));
      setSyncing(false);
    };

    // Active timers channel (start/stop)
    const activeTimersChannel = supabase
      .channel(`active-timer-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_timers", filter: `user_id=eq.${userId}` },
        async (payload) => {
          if (!isMounted) return;
          if (payload.eventType === "DELETE") {
            setRunningTimer(null);
            return;
          }
          // For INSERT/UPDATE, re-fetch to include joined project info
          await loadActiveTimer();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          loadActiveTimer();
        }
        if (status === "CHANNEL_ERROR") {
          toast.error("Realtime timer connection lost. Falling back to polling.");
        }
      });

    // Time entries channel (timeline updates)
    const entriesChannel = supabase
      .channel(`time-entries-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_entries", filter: `user_id=eq.${userId}` },
        async () => {
          if (!isMounted) return;
          queryClient.invalidateQueries({ queryKey: ["time-tracker-entries", userId] });
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          toast.error("Realtime timeline connection lost. Polling as fallback.");
        }
      });

    // Polling fallback (hybrid safety net): timers every 10s, entries every 15s
    const timerPollId = setInterval(loadActiveTimer, 10_000);
    pollEntriesRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["time-tracker-entries", userId] });
    }, 15_000);

    return () => {
      isMounted = false;
      clearInterval(timerPollId);
      if (pollEntriesRef.current) {
        clearInterval(pollEntriesRef.current);
      }
      supabase.removeChannel(activeTimersChannel);
      supabase.removeChannel(entriesChannel);
    };
  }, [queryClient, setRunningTimer, setSyncing, userId]);

  return <>{children}</>;
}


