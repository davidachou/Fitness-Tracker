"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { differenceInSeconds } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "" });
  const [projectForm, setProjectForm] = useState({ clientId: "", name: "", billable: true });
  const [archiveClientId, setArchiveClientId] = useState<string>("");
  const [archiveProjectId, setArchiveProjectId] = useState<string>("");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
        setIsAdmin(Boolean(profile?.is_admin));
      }
    };
    loadUser();
  }, [supabase]);

  const projectsQuery = useQuery({
    queryKey: ["time-tracker-projects", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_tracker_projects")
        .select("id, name, billable, archived, clients(name, archived)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      type ProjectRow = {
        id: string;
        name: string;
        billable: boolean | null;
        archived?: boolean | null;
        clients:
          | { name?: string | null; archived?: boolean | null }
          | { name?: string | null; archived?: boolean | null }[]
          | null;
      };
      return (data as ProjectRow[]).map((p) => {
        const clients = p.clients;
        const clientName = Array.isArray(clients) ? clients[0]?.name ?? null : clients?.name ?? null;
        const clientArchived = Array.isArray(clients) ? clients[0]?.archived ?? false : clients?.archived ?? false;
        return {
          id: p.id,
          name: p.name,
          billable: p.billable,
          client: clientName,
          archived: p.archived ?? false,
          client_archived: clientArchived,
        };
      }) as ProjectOption[];
    },
  });

  const clientsQuery = useQuery({
    queryKey: ["time-tracker-clients", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, archived")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as { id: string; name: string; archived?: boolean | null }[];
    },
  });

  const entriesQuery = useQuery({
    queryKey: ["time-tracker-entries", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(
          "id, user_id, project_id, client_id, task_id, description, start_time, end_time, duration_seconds, billable, time_tracker_projects(name, billable, archived, clients(name, archived)), clients(name, archived), time_tracker_tasks(name, project_id)",
        )
        .eq("user_id", user!.id)
        .order("start_time", { ascending: false });
      if (error) throw error;
      type EntryRow = {
        id: string;
        user_id: string | null;
        project_id: string | null;
        client_id: string | null;
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
              archived?: boolean | null;
              clients?:
                | { name?: string | null; archived?: boolean | null }
                | { name?: string | null; archived?: boolean | null }[]
                | null;
            }
          | {
              name?: string | null;
              billable?: boolean | null;
              archived?: boolean | null;
              clients?:
                | { name?: string | null; archived?: boolean | null }
                | { name?: string | null; archived?: boolean | null }[]
                | null;
            }[]
          | null;
        clients:
          | { name?: string | null; archived?: boolean | null }
          | { name?: string | null; archived?: boolean | null }[]
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

        const clientRelFromProject = projectRel?.clients;
        const clientRelFromDirect = row.clients;

        const normalizeClient = (
          rel?:
            | { name?: string | null; archived?: boolean | null }
            | { name?: string | null; archived?: boolean | null }[]
            | null,
        ) => {
          const value = Array.isArray(rel) ? rel[0] : rel;
          return { name: value?.name ?? null, archived: value?.archived ?? false };
        };

        const clientFromProject = normalizeClient(clientRelFromProject);
        const clientFromDirect = normalizeClient(clientRelFromDirect);
        const preferDirect = row.project_id === UNASSIGNED_PROJECT_ID;

        const primaryClient = preferDirect ? clientFromDirect : clientFromProject;
        const secondaryClient = preferDirect ? clientFromProject : clientFromDirect;

        let clientName = primaryClient.name ?? secondaryClient.name ?? null;
        let clientArchived = primaryClient.archived || secondaryClient.archived;

        if (!clientName && row.client_id) {
          const fallback = clientsQuery.data?.find((c) => c.id === row.client_id);
          clientName = fallback?.name ?? null;
          clientArchived = fallback?.archived ?? false;
        }

        const taskRel = Array.isArray(row.time_tracker_tasks)
          ? row.time_tracker_tasks[0]
          : row.time_tracker_tasks;

        return {
          id: row.id,
          project_id: row.project_id,
          project_name:
            projectRel?.name ||
            (row.project_id === UNASSIGNED_PROJECT_ID ? UNASSIGNED_PROJECT_NAME : null),
          project_archived: projectRel?.archived ?? false,
          client_archived: clientArchived,
          client: clientName,
          task_id: row.task_id,
          task_name: taskRel?.name,
          description: row.description,
          duration_seconds: row.duration_seconds,
          billable: row.billable,
          start_time: row.start_time,
          end_time: row.end_time,
          client_id: row.client_id,
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
      const clientId = values.client
        ? clientsQuery.data?.find((c) => c.name === values.client)?.id ?? null
        : null;

      const { data: existing } = await supabase
        .from("active_timers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        throw new Error("You already have a running timer.");
      }
      const { data, error } = await supabase
        .from("active_timers")
        .insert({
          user_id: user.id,
          project_id: projectId,
          client_id: clientId,
          task_id: values.taskId || null,
          description: values.description || null,
        })
        .select("id, user_id, project_id, client_id, task_id, description, start_time, time_tracker_projects(name, billable)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row, variables) => {
      toast.success("Timer started");
      const projectId = row?.project_id || variables?.projectId || UNASSIGNED_PROJECT_ID;
      const projectRel = row?.time_tracker_projects;
      const projectName =
        projectRel && !Array.isArray(projectRel)
          ? (projectRel as { name?: string | null; billable?: boolean | null })?.name ?? undefined
          : projects.find((p) => p.id === projectId)?.name ??
            (projectId === UNASSIGNED_PROJECT_ID ? UNASSIGNED_PROJECT_NAME : undefined);
      const clientId = row?.client_id ?? (variables?.client
        ? clientsQuery.data?.find((c) => c.name === variables.client)?.id ?? null
        : null);
      setRunningTimer({
        id: row?.id ?? crypto.randomUUID(),
        user_id: user!.id,
        project_id: projectId,
        client_id: clientId,
        client_name:
          variables?.client ??
          clientsQuery.data?.find((c) => c.id === clientId)?.name ??
          null,
        project_name: projectName,
        task_id: variables?.taskId || null,
        task_name: tasksQuery.data?.find((t) => t.id === variables?.taskId)?.name,
        description: row?.description ?? variables?.description ?? null,
        billable:
          (projectRel && !Array.isArray(projectRel)
            ? (projectRel as { billable?: boolean | null })?.billable ?? null
            : null) ??
          projects.find((p) => p.id === projectId)?.billable ??
          true,
        start_time: row?.start_time ?? new Date().toISOString(),
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
      const clientId = runningTimer.client_id || null;
      const end = new Date();
      const start = new Date(runningTimer.start_time);
      const duration = Math.max(1, differenceInSeconds(end, start));

      const { error: insertError } = await supabase.from("time_entries").insert({
        user_id: user.id,
        project_id: projectId,
        client_id: clientId,
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
                client: runningTimer.client_name ?? null,
                client_id: clientId,
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
      const clientId = values.client
        ? clientsQuery.data?.find((c) => c.name === values.client)?.id ?? null
        : null;
      const projectId = values.projectId || UNASSIGNED_PROJECT_ID;
      const start = new Date(values.startTime);
      const end = new Date(values.endTime);
      const duration = Math.max(1, differenceInSeconds(end, start));

      const { error, data } = await supabase
        .from("time_entries")
        .insert({
          user_id: user.id,
          project_id: projectId,
          client_id: clientId,
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
      const clientId = input.client
        ? clientsQuery.data?.find((c) => c.name === input.client)?.id ?? null
        : null;
      const start = new Date(input.startTime);
      const end = new Date(input.endTime);
      const duration = Math.max(1, differenceInSeconds(end, start));

      const { error } = await supabase
        .from("time_entries")
        .update({
          project_id: projectId,
          client_id: clientId,
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

  const createClientMutation = useMutation({
    mutationFn: async (values: { name: string }) => {
      if (!user?.id) throw new Error("Missing user");
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: values.name.trim(),
        })
        .select("id, name")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Client created");
      setClientForm({ name: "" });
      queryClient.invalidateQueries({ queryKey: ["time-tracker-clients", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["time-tracker-projects", user?.id] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not create client"),
  });

  const createProjectMutation = useMutation({
    mutationFn: async (values: { clientId: string; name: string; billable: boolean }) => {
      if (!user?.id) throw new Error("Missing user");
      if (!values.clientId) throw new Error("Select a client");
      const { data, error } = await supabase
        .from("time_tracker_projects")
        .insert({
          client_id: values.clientId,
          name: values.name.trim(),
          billable: values.billable,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Project created");
      setProjectForm({ clientId: "", name: "", billable: true });
      queryClient.invalidateQueries({ queryKey: ["time-tracker-projects", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["time-tracker-entries", user?.id] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not create project"),
  });

  const archiveClientMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from("clients")
        .update({ archived, archived_at: archived ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client updated");
      queryClient.invalidateQueries({ queryKey: ["time-tracker-clients", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["time-tracker-projects", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["time-tracker-entries", user?.id] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not update client"),
  });

  const archiveProjectMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from("time_tracker_projects")
        .update({ archived, archived_at: archived ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project updated");
      queryClient.invalidateQueries({ queryKey: ["time-tracker-projects", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["time-tracker-entries", user?.id] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not update project"),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Missing user");
      const { error } = await supabase.from("time_entries").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry deleted");
      queryClient.invalidateQueries({ queryKey: ["time-tracker-entries", user?.id] });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Could not delete entry"),
  });

  const batchEntryMutation = useMutation({
    mutationFn: async (rows: BatchEntryInput[]) => {
      if (!user?.id) throw new Error("Missing user");
      const payload = rows.map((r) => {
        const start = new Date(r.startTime);
        const end = new Date(r.endTime);
        const duration = Math.max(1, differenceInSeconds(end, start));
        const clientId = r.client ? clientsQuery.data?.find((c) => c.name === r.client)?.id ?? null : null;
        return {
          user_id: user.id,
          project_id: r.projectId || UNASSIGNED_PROJECT_ID,
          client_id: clientId,
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
  const clients = clientsQuery.data ?? [];
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
            clients={clients}
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
        clients={clients}
        tasks={tasks}
        onOpenBatchAction={() => setBatchOpen(true)}
        onGenerateReportAction={() => setReportsOpen(true)}
        onUpdateEntryAction={async (input) => {
          await updateEntryMutation.mutateAsync(input);
        }}
        isUpdating={updateEntryMutation.isPending}
        onDeleteEntryAction={async (id) => {
          await deleteEntryMutation.mutateAsync(id);
        }}
        isDeleting={deleteEntryMutation.isPending}
      />

      {isAdmin && (
        <Card className="border-dashed border-primary/30 bg-card/80">
          <CardHeader>
            <CardTitle>Admin · Clients & Projects</CardTitle>
            <CardDescription>Seed new clients and projects directly from the UI.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">Add client</p>
                <p className="text-xs text-muted-foreground">Name required.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={clientForm.name}
                    onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., New Client LLC"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!clientForm.name.trim()) {
                        toast.error("Client name is required");
                        return;
                      }
                      await createClientMutation.mutateAsync(clientForm);
                    }}
                    disabled={createClientMutation.isPending}
                  >
                    {createClientMutation.isPending ? "Saving..." : "Add client"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setClientForm({ name: "" })}
                    disabled={createClientMutation.isPending}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">Add project</p>
                <p className="text-xs text-muted-foreground">Requires a client; billable defaults on.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={projectForm.clientId || (clients[0]?.id ?? "")}
                    onValueChange={(val) => setProjectForm((prev) => ({ ...prev, clientId: val }))}
                    disabled={clientsQuery.isLoading || clients.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={clientsQuery.isLoading ? "Loading..." : "Select client"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project name</Label>
                  <Input
                    value={projectForm.name}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Pricing Analysis"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="billable-toggle"
                    checked={projectForm.billable}
                    onCheckedChange={(val) => setProjectForm((prev) => ({ ...prev, billable: Boolean(val) }))}
                  />
                  <Label htmlFor="billable-toggle">Billable</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!projectForm.clientId) {
                        toast.error("Select a client");
                        return;
                      }
                      if (!projectForm.name.trim()) {
                        toast.error("Project name is required");
                        return;
                      }
                      await createProjectMutation.mutateAsync(projectForm);
                    }}
                    disabled={createProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending ? "Saving..." : "Add project"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setProjectForm({ clientId: "", name: "", billable: true })}
                    disabled={createProjectMutation.isPending}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <div>
                  <p className="text-sm font-semibold">Archive / Unarchive client</p>
                  <p className="text-xs text-muted-foreground">Hide from selection lists without deleting data.</p>
                </div>
                <Select value={archiveClientId} onValueChange={(val) => setArchiveClientId(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.archived ? "(Archived)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (!archiveClientId) {
                        toast.error("Select a client");
                        return;
                      }
                      await archiveClientMutation.mutateAsync({ id: archiveClientId, archived: true });
                    }}
                    disabled={archiveClientMutation.isPending}
                  >
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!archiveClientId) {
                        toast.error("Select a client");
                        return;
                      }
                      await archiveClientMutation.mutateAsync({ id: archiveClientId, archived: false });
                    }}
                    disabled={archiveClientMutation.isPending}
                  >
                    Unarchive
                  </Button>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <div>
                  <p className="text-sm font-semibold">Archive / Unarchive project</p>
                  <p className="text-xs text-muted-foreground">Prevent new time entries without losing history.</p>
                </div>
                <Select value={archiveProjectId} onValueChange={(val) => setArchiveProjectId(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.archived ? "(Archived)" : ""} {p.client ? `— ${p.client}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (!archiveProjectId) {
                        toast.error("Select a project");
                        return;
                      }
                      await archiveProjectMutation.mutateAsync({ id: archiveProjectId, archived: true });
                    }}
                    disabled={archiveProjectMutation.isPending}
                  >
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!archiveProjectId) {
                        toast.error("Select a project");
                        return;
                      }
                      await archiveProjectMutation.mutateAsync({ id: archiveProjectId, archived: false });
                    }}
                    disabled={archiveProjectMutation.isPending}
                  >
                    Unarchive
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ReportsModal open={reportsOpen} onClose={() => setReportsOpen(false)} entries={entries} />

      <BatchEntryDialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        projects={projects}
        tasks={tasks}
        clients={clients}
        onSubmit={async (rows) => {
          await batchEntryMutation.mutateAsync(rows);
        }}
        isSubmitting={batchEntryMutation.isPending}
      />
    </div>
  );
}


