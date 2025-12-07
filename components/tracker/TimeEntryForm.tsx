"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlayCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const startSchema = z.object({
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  description: z.string().optional(),
});

const manualSchema = z
  .object({
    projectId: z.string().optional(),
    taskId: z.string().optional(),
    description: z.string().optional(),
    startTime: z.string().min(1, "Start time required"),
    endTime: z.string().min(1, "End time required"),
    billable: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return end.getTime() > start.getTime();
    },
    { message: "End time must be after start time", path: ["endTime"] },
  );

export type StartFormValues = z.infer<typeof startSchema>;
export type ManualFormValues = z.infer<typeof manualSchema>;

export type ProjectOption = {
  id: string;
  name: string;
  client?: string | null;
  billable?: boolean | null;
};

export type TaskOption = {
  id: string;
  name: string;
  project_id: string | null;
};

type TimeEntryFormProps = {
  projects: ProjectOption[];
  tasks: TaskOption[];
  isStarting?: boolean;
  isManualSubmitting?: boolean;
  isCreatingTask?: boolean;
  onStart: (values: StartFormValues) => Promise<void> | void;
  onManualSubmit: (values: ManualFormValues) => Promise<void> | void;
  onCreateTask: (input: { name: string; projectId?: string }) => Promise<void> | void;
  disableStart?: boolean;
};

export function TimeEntryForm({
  projects,
  tasks,
  isStarting,
  isManualSubmitting,
  isCreatingTask,
  onStart,
  onManualSubmit,
  onCreateTask,
  disableStart,
}: TimeEntryFormProps) {
  const [newTaskName, setNewTaskName] = useState("");
  const [startClient, setStartClient] = useState<string>("");
  const [manualClient, setManualClient] = useState<string>("");

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.client) set.add(p.client);
    });
    return Array.from(set);
  }, [projects]);
  const startForm = useForm<StartFormValues>({
    resolver: zodResolver(startSchema),
    defaultValues: {
      projectId: undefined,
      taskId: undefined,
      description: "",
    },
  });

  const manualForm = useForm<ManualFormValues>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      projectId: undefined,
      taskId: undefined,
      description: "",
      startTime: defaultDateTime(),
      endTime: defaultDateTime(60),
      billable: true,
    },
  });

  // Initialize client filters to first available client when projects change
  useEffect(() => {
    if (projects.length > 0) {
      const firstClient = projects.find((p) => p.client)?.client ?? "";
      setStartClient((prev) => (prev ? prev : firstClient));
      setManualClient((prev) => (prev ? prev : firstClient));
    } else {
      setStartClient("");
      setManualClient("");
      startForm.setValue("projectId", undefined);
      manualForm.setValue("projectId", undefined);
      startForm.setValue("taskId", undefined);
      manualForm.setValue("taskId", undefined);
    }
  }, [projects, startForm, manualForm]);

  // Clear selections when client is cleared
  useEffect(() => {
    if (!startClient) {
      startForm.setValue("projectId", undefined);
      startForm.setValue("taskId", undefined);
    }
  }, [startClient, startForm]);

  useEffect(() => {
    if (!manualClient) {
      manualForm.setValue("projectId", undefined);
      manualForm.setValue("taskId", undefined);
    }
  }, [manualClient, manualForm]);

  const filterProjects = useMemo(
    () => (clientFilter: string) => projects.filter((p) => !clientFilter || p.client === clientFilter),
    [projects],
  );

  const filterTasks = useMemo(
    () => (projectId?: string | null) => (projectId ? tasks.filter((t) => t.project_id === projectId) : []),
    [tasks],
  );

  // When client changes, clear project/task if the selected project is no longer valid
  useEffect(() => {
    const filtered = filterProjects(startClient);
    const current = startForm.watch("projectId");
    const stillValid = filtered.some((p) => p.id === current);
    if (!stillValid) {
      startForm.setValue("projectId", undefined, { shouldValidate: true });
      startForm.setValue("taskId", undefined);
    }
  }, [startClient, filterProjects, startForm]);

  useEffect(() => {
    const filtered = filterProjects(manualClient);
    const current = manualForm.watch("projectId");
    const stillValid = filtered.some((p) => p.id === current);
    if (!stillValid) {
      manualForm.setValue("projectId", undefined, { shouldValidate: true });
      manualForm.setValue("taskId", undefined);
    }
  }, [filterProjects, manualClient, manualForm]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        onSubmit={startForm.handleSubmit(async (values) => onStart(values))}
        className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Start a timer</p>
            <h3 className="text-lg font-semibold">Track now</h3>
          </div>
          <Button type="submit" size="sm" disabled={disableStart || isStarting}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {isStarting ? "Starting..." : disableStart ? "Timer running" : "Start"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={startClient} onValueChange={(val) => setStartClient(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose client" />
            </SelectTrigger>
            <SelectContent
              sideOffset={8}
              className="z-50 rounded-md border border-border/70 bg-popover shadow-2xl ring-1 ring-primary/30"
            >
              {uniqueClients.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Project</Label>
          {/**
           * Radix Select does not allow empty string values. Use a sentinel ("unassigned")
           * and map to undefined in form state so we store null on submit.
           */}
          {(() => {
            const filteredProjects = filterProjects(startClient);
            const startValue =
              disableStart || projects.length === 0 || !startClient || filteredProjects.length === 0
                ? "unassigned"
                : startForm.watch("projectId") ?? "unassigned";
            const disabled = disableStart || projects.length === 0 || !startClient;
            return (
              <Select
                value={startValue}
                onValueChange={(val) =>
                  startForm.setValue("projectId", val === "unassigned" ? undefined : val, {
                    shouldValidate: true,
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose project" />
                </SelectTrigger>
                <SelectContent
                  sideOffset={8}
                  className="z-50 rounded-md border border-border/70 bg-popover shadow-2xl ring-1 ring-primary/30"
                >
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.client ? `${p.name} — ${p.client}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
        </div>

        <div className="space-y-2">
          <Label>Task</Label>
          {(() => {
            const taskValue = startForm.watch("taskId") ?? "unassigned";
            const selectedProject = startForm.watch("projectId");
            const taskOptions = filterTasks(selectedProject);
            const disabled = !selectedProject || taskOptions.length === 0;
            return (
              <Select
                value={taskValue}
                onValueChange={(val) =>
                  startForm.setValue("taskId", val === "unassigned" ? undefined : val, {
                    shouldValidate: true,
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose task" />
                </SelectTrigger>
                <SelectContent
                  sideOffset={8}
                  className="z-50 rounded-md border border-border/70 bg-popover shadow-2xl ring-1 ring-primary/30"
                >
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {taskOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
          <div className="flex items-center gap-2">
            <Input
              placeholder="New task name"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!newTaskName.trim() || isCreatingTask}
              onClick={async () => {
                await onCreateTask({
                  name: newTaskName.trim(),
                  projectId: startForm.watch("projectId") || undefined,
                });
                setNewTaskName("");
              }}
            >
              {isCreatingTask ? "Saving..." : "Add"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="What are you working on?"
            rows={2}
            {...startForm.register("description")}
            disabled={disableStart}
          />
        </div>
      </form>

      <form
        onSubmit={manualForm.handleSubmit(async (values) => onManualSubmit(values))}
        className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Manual entry</p>
            <h3 className="text-lg font-semibold">Add past time</h3>
          </div>
          <Button type="submit" size="sm" variant="secondary" className="gap-2" disabled={isManualSubmitting}>
            <PlusCircle className="h-4 w-4" />
            {isManualSubmitting ? "Saving..." : "Add entry"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={manualClient} onValueChange={(val) => setManualClient(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose client" />
            </SelectTrigger>
            <SelectContent
              sideOffset={8}
              className="z-50 rounded-md border border-border/70 bg-popover shadow-2xl ring-1 ring-primary/30"
            >
              {uniqueClients.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Project</Label>
          {(() => {
            const filteredProjects = filterProjects(manualClient);
            const manualValue =
              projects.length === 0 || !manualClient || filteredProjects.length === 0
                ? "unassigned"
                : manualForm.watch("projectId") ?? "unassigned";
            const disabled = projects.length === 0 || !manualClient;
            return (
              <Select
                value={manualValue}
                onValueChange={(val) =>
                  manualForm.setValue("projectId", val === "unassigned" ? undefined : val, {
                    shouldValidate: true,
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose project" />
                </SelectTrigger>
                <SelectContent
                  sideOffset={8}
                  className="z-50 rounded-md border border-border/70 bg-popover shadow-2xl ring-1 ring-primary/30"
                >
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.client ? `${p.name} — ${p.client}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
        </div>

        <div className="space-y-2">
          <Label>Task</Label>
          {(() => {
            const taskValue = manualForm.watch("taskId") ?? "unassigned";
            const selectedProject = manualForm.watch("projectId");
            const taskOptions = filterTasks(selectedProject);
            const disabled = !selectedProject || taskOptions.length === 0;
            return (
              <Select
                value={taskValue}
                onValueChange={(val) =>
                  manualForm.setValue("taskId", val === "unassigned" ? undefined : val, {
                    shouldValidate: true,
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose task" />
                </SelectTrigger>
                <SelectContent
                  sideOffset={8}
                  className="z-50 rounded-md border border-border/70 bg-popover shadow-2xl ring-1 ring-primary/30"
                >
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {taskOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
          <div className="flex items-center gap-2">
            <Input
              placeholder="New task name"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!newTaskName.trim() || isCreatingTask}
              onClick={async () => {
                await onCreateTask({
                  name: newTaskName.trim(),
                  projectId: manualForm.watch("projectId") || undefined,
                });
                setNewTaskName("");
              }}
            >
              {isCreatingTask ? "Saving..." : "Add"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea placeholder="What was done?" rows={2} {...manualForm.register("description")} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Start time</Label>
            <Input type="datetime-local" {...manualForm.register("startTime")} />
            {manualForm.formState.errors.startTime && (
              <p className="text-xs text-red-500">{manualForm.formState.errors.startTime.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>End time</Label>
            <Input type="datetime-local" {...manualForm.register("endTime")} />
            {manualForm.formState.errors.endTime && (
              <p className="text-xs text-red-500">{manualForm.formState.errors.endTime.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="billable"
            checked={manualForm.watch("billable")}
            onCheckedChange={(val) => manualForm.setValue("billable", Boolean(val))}
          />
          <Label htmlFor="billable">Billable</Label>
        </div>
      </form>
    </div>
  );
}

function defaultDateTime(addMinutes = 0) {
  const date = new Date(Date.now() + addMinutes * 60_000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}


