"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInSeconds } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TimeEntryForm, ProjectOption, StartFormValues, ManualFormValues, TaskOption } from "@/components/tracker/TimeEntryForm";
import { RunningTimer } from "@/components/tracker/RunningTimer";
import { TimeTimeline, TimelineEntry } from "@/components/tracker/TimeTimeline";
import { ReportsModal } from "@/components/tracker/ReportsModal";
import { useTimerStore } from "@/components/tracker/useTimerStore";

type User = { id: string } | null;
type TimeEntryRow = {
  id: string;
  time_tracker_projects?:
    | { name?: string | null; billable?: boolean | null; clients?: { name?: string | null } | null }
    | null;
  time_tracker_tasks?: { name?: string | null; project_id?: string | null } | null;
  description?: string | null;
  duration_seconds?: number | null;
  billable?: boolean | null;
  start_time: string;
  end_time?: string | null;
};

export default function TrackerPage() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { runningTimer, setRunningTimer } = useTimerStore();

  const [user, setUser] = useState<User>(null);
  const [reportsOpen, setReportsOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    loadUser();
  }, [supabase]);

  const projectsQuery = useQuery({
    queryKey: ["time-tracker-projects", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_tracker_projects")
        .select("id, name, billable, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        billable: p.billable,
        client: p.clients?.name ?? null,
      })) as ProjectOption[];
    },
  });

  const entriesQuery = useQuery({
    queryKey: ["time-tracker-entries", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(
          "id, user_id, project_id, task_id, description, start_time, end_time, duration_seconds, billable, time_tracker_projects(name, billable, clients(name)), time_tracker_tasks(name, project_id)",
        )
        .eq("user_id", user!.id)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data.map((row: TimeEntryRow) => ({
        id: row.id,
        project_name: row.time_tracker_projects?.name,
        client: row.time_tracker_projects?.clients?.name,
        task_name: row.time_tracker_tasks?.name,
        description: row.description,
        duration_seconds: row.duration_seconds,
        billable: row.billable,
        start_time: row.start_time,
        end_time: row.end_time,
      })) as TimelineEntry[];
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["time-tracker-tasks", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_tracker_tasks")
        .select("id, name, project_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TaskOption[];
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async ({ name, projectId }: { name: string; projectId?: string }) => {
      if (!user?.id) throw new Error("Missing user");
      if (!projectId) throw new Error("Select a project for the new task");
      const { data, error } = await supabase
        .from("time_tracker_tasks")
        .insert({
          project_id: projectId,
          name,
          created_by: user.id,
        })
        .select("id, name, project_id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Task created");
      queryClient.invalidateQueries({ queryKey: ["time-tracker-tasks", user?.id] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not create task"),
  });

  const startTimerMutation = useMutation({
    mutationFn: async (values: StartFormValues) => {
      if (!user?.id) throw new Error("Missing user");
      const { data: existing } = await supabase
        .from("active_timers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        throw new Error("You already have a running timer.");
      }
      const { error } = await supabase.from("active_timers").insert({
        user_id: user.id,
        project_id: values.projectId || null,
        task_id: values.taskId || null,
        description: values.description || null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success("Timer started");
      setRunningTimer({
        id: crypto.randomUUID(),
        user_id: user!.id,
        project_id: variables?.projectId || null,
        project_name: projects.find((p) => p.id === variables?.projectId)?.name ?? undefined,
        task_id: variables?.taskId || null,
        task_name: tasksQuery.data?.find((t) => t.id === variables?.taskId)?.name,
        description: variables?.description ?? null,
        billable: projects.find((p) => p.id === variables?.projectId)?.billable ?? true,
        start_time: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["active-timer", user?.id] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not start timer"),
  });

  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !runningTimer) throw new Error("No timer running");
      const end = new Date();
      const start = new Date(runningTimer.start_time);
      const duration = Math.max(1, differenceInSeconds(end, start));

      const { error: insertError } = await supabase.from("time_entries").insert({
        user_id: user.id,
        project_id: runningTimer.project_id,
        task_id: runningTimer.task_id || null,
        description: runningTimer.description,
        start_time: runningTimer.start_time,
        end_time: end.toISOString(),
        duration_seconds: duration,
        billable: runningTimer.billable ?? true,
      });
      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from("active_timers")
        .delete()
        .eq("id", runningTimer.id)
        .eq("user_id", user.id);
      if (deleteError) throw deleteError;

      // optimistic update entries
      queryClient.setQueryData<TimelineEntry[]>(["time-tracker-entries", user.id], (prev) =>
        prev
          ? [
              {
                id: crypto.randomUUID(),
                project_name: runningTimer.project_name,
                task_name: runningTimer.task_name,
                description: runningTimer.description,
                duration_seconds: duration,
                billable: runningTimer.billable ?? true,
                start_time: runningTimer.start_time,
                end_time: end.toISOString(),
              },
              ...prev,
            ]
          : prev,
      );
    },
    onSuccess: () => {
      setRunningTimer(null);
      toast.success("Timer stopped");
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not stop timer"),
  });

  const manualEntryMutation = useMutation({
    mutationFn: async (values: ManualFormValues) => {
      if (!user?.id) throw new Error("Missing user");
      const start = new Date(values.startTime);
      const end = new Date(values.endTime);
      const duration = Math.max(1, differenceInSeconds(end, start));

      const { error, data } = await supabase
        .from("time_entries")
        .insert({
          user_id: user.id,
          project_id: values.projectId || null,
          task_id: values.taskId || null,
          description: values.description,
          start_time: values.startTime,
          end_time: values.endTime,
          duration_seconds: duration,
          billable: values.billable,
        })
        .select("id")
        .single();
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["time-tracker-entries", user.id] });
      return data;
    },
    onSuccess: () => toast.success("Entry added"),
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Could not save entry"),
  });

  const projects = projectsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const entries = entriesQuery.data ?? [];

  if (!user) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Time Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {runningTimer ? (
            <RunningTimer onStop={() => stopTimerMutation.mutateAsync()} isStopping={stopTimerMutation.isPending} />
          ) : (
            <p className="text-sm text-muted-foreground">No active timer</p>
          )}
          <Separator />
          <TimeEntryForm
            key={projects.map((p) => p.id).join("-")}
            projects={projects}
            tasks={tasks}
            onStart={(vals) => startTimerMutation.mutateAsync(vals)}
            isStarting={startTimerMutation.isPending}
            disableStart={Boolean(runningTimer)}
            onManualSubmit={(vals) => manualEntryMutation.mutateAsync(vals)}
            isManualSubmitting={manualEntryMutation.isPending}
            onCreateTask={(input) =>
              createTaskMutation.mutateAsync({ name: input.name, projectId: input.projectId })
            }
            isCreatingTask={createTaskMutation.isPending}
          />
        </CardContent>
      </Card>

      <TimeTimeline entries={entries} onGenerateReport={() => setReportsOpen(true)} />

      <ReportsModal open={reportsOpen} onClose={() => setReportsOpen(false)} entries={entries} />
    </div>
  );
}


