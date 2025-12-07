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
import { TimeTimeline, TimelineEntry, EditEntryInput } from "@/components/tracker/TimeTimeline";
import { ReportsModal } from "@/components/tracker/ReportsModal";
import { BatchEntryDialog, BatchEntryInput } from "@/components/tracker/BatchEntryDialog";
import { useTimerStore } from "@/components/tracker/useTimerStore";

const UNASSIGNED_PROJECT_ID = "00000000-0000-0000-0000-000000000002";
const UNASSIGNED_PROJECT_NAME = "Unassigned";

type User = { id: string } | null;
export default function TrackerPage() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { runningTimer, setRunningTimer } = useTimerStore();

  const [user, setUser] = useState<User>(null);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

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
      type ProjectRow = {
        id: string;
        name: string;
        billable: boolean | null;
        clients: { name?: string | null } | { name?: string | null }[] | null;
      };
      return (data as ProjectRow[]).map((p) => {
        const clients = p.clients;
        const clientName = Array.isArray(clients) ? clients[0]?.name ?? null : clients?.name ?? null;
        return {
          id: p.id,
          name: p.name,
          billable: p.billable,
          client: clientName,
        };
      }) as ProjectOption[];
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
      type EntryRow = {
        id: string;
        user_id: string | null;
        project_id: string | null;
        task_id: string | null;
        description: string | null;
        start_time: string;
        end_time: string | null;
        duration_seconds: number | null;
        billable: boolean | null;
        time_tracker_projects:
          | {
              name?: string | null;
              billable?: boolean | null;
              clients?: { name?: string | null } | { name?: string | null }[] | null;
            }
          | {
              name?: string | null;
              billable?: boolean | null;
              clients?: { name?: string | null } | { name?: string | null }[] | null;
            }[]
          | null;
        time_tracker_tasks:
          | { name?: string | null; project_id?: string | null }
          | { name?: string | null; project_id?: string | null }[]
          | null;
      };

      return (data as EntryRow[]).map((row) => {
        const projectRel = Array.isArray(row.time_tracker_projects)
          ? row.time_tracker_projects[0]
          : row.time_tracker_projects;
        const clientRel = projectRel?.clients;
        const clientName = Array.isArray(clientRel) ? clientRel[0]?.name ?? null : clientRel?.name ?? null;

        const taskRel = Array.isArray(row.time_tracker_tasks)
          ? row.time_tracker_tasks[0]
          : row.time_tracker_tasks;

        return {
          id: row.id,
          project_id: row.project_id,
          project_name: projectRel?.name,
          client: clientName,
          task_id: row.task_id,
          task_name: taskRel?.name,
          description: row.description,
          duration_seconds: row.duration_seconds,
          billable: row.billable,
          start_time: row.start_time,
          end_time: row.end_time,
        };
      }) as TimelineEntry[];
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
      const projectId = values.projectId || UNASSIGNED_PROJECT_ID;
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
        project_id: projectId,
        task_id: values.taskId || null,
        description: values.description || null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success("Timer started");
      const projectId = variables?.projectId || UNASSIGNED_PROJECT_ID;
      const projectName =
        projects.find((p) => p.id === projectId)?.name ??
        (projectId === UNASSIGNED_PROJECT_ID ? UNASSIGNED_PROJECT_NAME : undefined);
      setRunningTimer({
        id: crypto.randomUUID(),
        user_id: user!.id,
        project_id: projectId,
        project_name: projectName,
        task_id: variables?.taskId || null,
        task_name: tasksQuery.data?.find((t) => t.id === variables?.taskId)?.name,
        description: variables?.description ?? null,
        billable: projects.find((p) => p.id === projectId)?.billable ?? true,
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
      const projectId = runningTimer.project_id || UNASSIGNED_PROJECT_ID;
      const end = new Date();
      const start = new Date(runningTimer.start_time);
      const duration = Math.max(1, differenceInSeconds(end, start));

      const { error: insertError } = await supabase.from("time_entries").insert({
        user_id: user.id,
        project_id: projectId,
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
                project_name: runningTimer.project_name ?? UNASSIGNED_PROJECT_NAME,
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
      const projectId = values.projectId || UNASSIGNED_PROJECT_ID;
      const start = new Date(values.startTime);
      const end = new Date(values.endTime);
      const duration = Math.max(1, differenceInSeconds(end, start));

      const { error, data } = await supabase
        .from("time_entries")
        .insert({
          user_id: user.id,
          project_id: projectId,
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

  const updateEntryMutation = useMutation({
    mutationFn: async (input: EditEntryInput) => {
      if (!user?.id) throw new Error("Missing user");
      const projectId = input.projectId || UNASSIGNED_PROJECT_ID;
      const start = new Date(input.startTime);
      const end = new Date(input.endTime);
      const duration = Math.max(1, differenceInSeconds(end, start));

      const { error } = await supabase
        .from("time_entries")
        .update({
          project_id: projectId,
          task_id: input.taskId || null,
          description: input.description,
          start_time: input.startTime,
          end_time: input.endTime,
          duration_seconds: duration,
          billable: input.billable ?? true,
        })
        .eq("id", input.id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry updated");
      queryClient.invalidateQueries({ queryKey: ["time-tracker-entries", user?.id] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not update entry"),
  });

  const batchEntryMutation = useMutation({
    mutationFn: async (rows: BatchEntryInput[]) => {
      if (!user?.id) throw new Error("Missing user");
      const payload = rows.map((r) => {
        const start = new Date(r.startTime);
        const end = new Date(r.endTime);
        const duration = Math.max(1, differenceInSeconds(end, start));
        return {
          user_id: user.id,
          project_id: r.projectId || UNASSIGNED_PROJECT_ID,
          task_id: r.taskId || null,
          description: r.description || null,
          start_time: r.startTime,
          end_time: r.endTime,
          duration_seconds: duration,
          billable: r.billable ?? true,
        };
      });
      const { error } = await supabase.from("time_entries").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Batch entries added");
      queryClient.invalidateQueries({ queryKey: ["time-tracker-entries", user?.id] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not save batch"),
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
            onStart={async (vals) => {
              await startTimerMutation.mutateAsync(vals);
            }}
            isStarting={startTimerMutation.isPending}
            disableStart={Boolean(runningTimer)}
            onManualSubmit={async (vals) => {
              await manualEntryMutation.mutateAsync(vals);
            }}
            isManualSubmitting={manualEntryMutation.isPending}
            onCreateTask={async (input) => {
              await createTaskMutation.mutateAsync({ name: input.name, projectId: input.projectId });
            }}
            isCreatingTask={createTaskMutation.isPending}
          />
        </CardContent>
      </Card>

      <TimeTimeline
        entries={entries}
        projects={projects}
        tasks={tasks}
        onOpenBatch={() => setBatchOpen(true)}
        onGenerateReport={() => setReportsOpen(true)}
        onUpdateEntry={async (input) => {
          await updateEntryMutation.mutateAsync(input);
        }}
        isUpdating={updateEntryMutation.isPending}
      />

      <ReportsModal open={reportsOpen} onClose={() => setReportsOpen(false)} entries={entries} />

      <BatchEntryDialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        projects={projects}
        tasks={tasks}
        onSubmit={async (rows) => {
          await batchEntryMutation.mutateAsync(rows);
        }}
        isSubmitting={batchEntryMutation.isPending}
      />
    </div>
  );
}


