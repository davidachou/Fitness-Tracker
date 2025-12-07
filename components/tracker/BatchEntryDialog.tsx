"use client";

import { useMemo, useState } from "react";
import { differenceInSeconds } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProjectOption, TaskOption } from "./TimeEntryForm";

export type BatchEntryInput = {
  id: string;
  client?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  description?: string | null;
  startTime: string;
  endTime: string;
  billable?: boolean | null;
};

const UNASSIGNED_CLIENT_LABEL = "Unassigned";
const UNASSIGNED_PROJECT_ID = "00000000-0000-0000-0000-000000000002";

const defaultRow = (): BatchEntryInput => {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(start.getMinutes() - start.getMinutes() % 30);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    id: crypto.randomUUID(),
    client: UNASSIGNED_CLIENT_LABEL,
    projectId: UNASSIGNED_PROJECT_ID,
    taskId: null,
    description: "",
    startTime: toInput(start),
    endTime: toInput(end),
    billable: true,
  };
};

function toInput(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

type Props = {
  open: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  tasks: TaskOption[];
  onSubmit: (rows: BatchEntryInput[]) => Promise<void> | void;
  isSubmitting?: boolean;
};

export function BatchEntryDialog({ open, onClose, projects, tasks, onSubmit, isSubmitting }: Props) {
  const [rows, setRows] = useState<BatchEntryInput[]>([defaultRow(), defaultRow()]);
  const [error, setError] = useState<string | null>(null);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.client) set.add(p.client);
    });
    set.add(UNASSIGNED_CLIENT_LABEL);
    return Array.from(set);
  }, [projects]);

  const projectsForClient = useMemo(
    () => (client?: string | null) =>
      client && client !== UNASSIGNED_CLIENT_LABEL
        ? projects.filter((p) => p.client === client)
        : projects.filter((p) => p.id === UNASSIGNED_PROJECT_ID),
    [projects],
  );

  const tasksForProject = useMemo(
    () => (projectId?: string | null) => (projectId ? tasks.filter((t) => t.project_id === projectId) : []),
    [tasks],
  );

  const updateRow = (id: string, patch: Partial<BatchEntryInput>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, defaultRow()]);
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const handleSave = async () => {
    setError(null);
    if (rows.length === 0) {
      setError("Add at least one entry.");
      return;
    }

    for (const row of rows) {
      if (!row.startTime || !row.endTime) {
        setError("Start and end time are required for all rows.");
        return;
      }
      const start = new Date(row.startTime);
      const end = new Date(row.endTime);
      if (end.getTime() <= start.getTime()) {
        setError("End time must be after start time on all rows.");
        return;
      }
      const duration = differenceInSeconds(end, start);
      if (!duration || duration < 1) {
        setError("Duration must be at least 1 second.");
        return;
      }
    }

    await onSubmit(rows.map((r) => ({ ...r, projectId: r.projectId || UNASSIGNED_PROJECT_ID })));
    onClose();
    setRows([defaultRow(), defaultRow()]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] w-full max-w-[1600px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Batch add time entries</DialogTitle>
          <DialogDescription>Quickly add multiple time entries in one go.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Use the widest space to enter your week or day.</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Add row
            </Button>
          </div>

          <ScrollArea className="h-[55vh] rounded-lg border border-border/60">
            <div className="min-w-[1500px] divide-y divide-border/60">
              <div className="grid grid-cols-[1.2fr,1.2fr,1fr,1fr,1fr,1.8fr,120px,120px] gap-3 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Client</span>
                <span>Project</span>
                <span>Task</span>
                <span>Start</span>
                <span>End</span>
                <span>Description</span>
                <span>Billable</span>
                <span>Actions</span>
              </div>
              {rows.map((row) => {
                const projectOptions = projectsForClient(row.client);
                const taskOptions = tasksForProject(row.projectId);
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1.2fr,1.2fr,1fr,1fr,1fr,1.8fr,120px,120px] items-start gap-3 px-3 py-3"
                  >
                    <Select
                      value={row.client || UNASSIGNED_CLIENT_LABEL}
                      onValueChange={(val) =>
                        updateRow(row.id, {
                          client: val,
                          projectId: UNASSIGNED_PROJECT_ID,
                          taskId: null,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Client" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueClients.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={row.projectId || UNASSIGNED_PROJECT_ID}
                      onValueChange={(val) => updateRow(row.id, { projectId: val, taskId: null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_PROJECT_ID}>Unassigned</SelectItem>
                        {projectOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.client ? `${p.name} — ${p.client}` : p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={row.taskId ?? "unassigned"}
                      onValueChange={(val) => updateRow(row.id, { taskId: val === "unassigned" ? null : val })}
                      disabled={taskOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Task" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {taskOptions.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="datetime-local"
                      value={row.startTime}
                      onChange={(e) => updateRow(row.id, { startTime: e.target.value })}
                    />
                    <Input
                      type="datetime-local"
                      value={row.endTime}
                      onChange={(e) => updateRow(row.id, { endTime: e.target.value })}
                    />
                    <Textarea
                      value={row.description ?? ""}
                      onChange={(e) => updateRow(row.id, { description: e.target.value })}
                      rows={3}
                      className="min-h-[64px]"
                    />
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={row.billable ?? true}
                        onCheckedChange={(val) => updateRow(row.id, { billable: Boolean(val) })}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

