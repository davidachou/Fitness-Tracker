"use client";

import { useMemo, useState } from "react";
import { format, intervalToDuration, isAfter, startOfToday, startOfWeek } from "date-fns";
import { Clock3, DollarSign, FileSpreadsheet, Timer, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectOption, TaskOption } from "./TimeEntryForm";

export type TimelineEntry = {
  id: string;
  project_id?: string | null;
  project_name?: string | null;
  client?: string | null;
  task_id?: string | null;
  task_name?: string | null;
  description?: string | null;
  duration_seconds?: number | null;
  billable?: boolean | null;
  start_time: string;
  end_time?: string | null;
};

type TimeTimelineProps = {
  entries: TimelineEntry[];
  onGenerateReport: () => void;
  onOpenBatch?: () => void;
  projects: ProjectOption[];
  tasks: TaskOption[];
  onUpdateEntry: (input: EditEntryInput) => Promise<void> | void;
  isUpdating?: boolean;
};

export type EditEntryInput = {
  id: string;
  client?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  description?: string | null;
  startTime: string;
  endTime: string;
  billable?: boolean | null;
};

const UNASSIGNED_PROJECT_ID = "00000000-0000-0000-0000-000000000002";
const UNASSIGNED_CLIENT_LABEL = "Unassigned";

function secondsToLabel(seconds = 0) {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  const hrs = duration.hours?.toString().padStart(2, "0") ?? "00";
  const mins = duration.minutes?.toString().padStart(2, "0") ?? "00";
  return `${hrs}:${mins}`;
}

function isoToInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function inputToIso(value: string) {
  return value ? new Date(value).toISOString() : "";
}

export function TimeTimeline({
  entries,
  onGenerateReport,
  onOpenBatch,
  projects,
  tasks,
  onUpdateEntry,
  isUpdating,
}: TimeTimelineProps) {
  const [tab, setTab] = useState<"today" | "week" | "all">("today");
  const [editing, setEditing] = useState<EditEntryInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.client) set.add(p.client);
    });
    set.add(UNASSIGNED_CLIENT_LABEL);
    return Array.from(set);
  }, [projects]);

  const filteredEntries = useMemo(() => {
    if (tab === "all") return entries;
    if (tab === "today") {
      const start = startOfToday();
      return entries.filter((entry) => isAfter(new Date(entry.start_time), start));
    }
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return entries.filter((entry) => isAfter(new Date(entry.start_time), start));
  }, [entries, tab]);

  const grouped = useMemo(() => {
    return filteredEntries.reduce<Record<string, TimelineEntry[]>>((acc, entry) => {
      const key = format(new Date(entry.start_time), "EEEE, MMM d");
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    }, {});
  }, [filteredEntries]);

  const totalSeconds = filteredEntries.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);
  const billableSeconds = filteredEntries.reduce(
    (sum, e) => sum + (e.billable === false ? 0 : e.duration_seconds ?? 0),
    0,
  );

  const tasksForProject = useMemo(
    () => (projectId?: string | null) => (projectId ? tasks.filter((t) => t.project_id === projectId) : []),
    [tasks],
  );

  const projectsForClient = useMemo(
    () => (client?: string | null) =>
      client && client !== UNASSIGNED_CLIENT_LABEL
        ? projects.filter((p) => p.client === client)
        : projects.filter((p) => p.id === UNASSIGNED_PROJECT_ID),
    [projects],
  );

  const openEdit = (entry: TimelineEntry) => {
    setError(null);
    const project = projects.find((p) => p.id === entry.project_id);
    const clientName = project?.client ?? entry.client ?? UNASSIGNED_CLIENT_LABEL;
    setEditing({
      id: entry.id,
      client: clientName,
      projectId: entry.project_id || UNASSIGNED_PROJECT_ID,
      taskId: entry.task_id || null,
      description: entry.description ?? "",
      startTime: isoToInput(entry.start_time),
      endTime: isoToInput(entry.end_time ?? entry.start_time),
      billable: entry.billable ?? true,
    });
  };

  const closeEdit = () => {
    if (isUpdating) return;
    setEditing(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setError(null);
    if (!editing.startTime || !editing.endTime) {
      setError("Start and end time are required");
      return;
    }
    const start = new Date(editing.startTime);
    const end = new Date(editing.endTime);
    if (end.getTime() <= start.getTime()) {
      setError("End time must be after start time");
      return;
    }
    await onUpdateEntry({
      id: editing.id,
      projectId: editing.projectId || UNASSIGNED_PROJECT_ID,
      taskId: editing.taskId || null,
      description: editing.description || "",
      startTime: inputToIso(editing.startTime),
      endTime: inputToIso(editing.endTime),
      billable: editing.billable,
    });
    closeEdit();
  };

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">Entries grouped by day</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={tab} onValueChange={(val) => setTab(val as typeof tab)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
          {onOpenBatch && (
            <Button variant="outline" size="sm" className="gap-2" onClick={onOpenBatch}>
              <Timer className="h-4 w-4" />
              Batch add
            </Button>
          )}
          <Button variant="secondary" size="sm" className="gap-2" onClick={onGenerateReport}>
            <FileSpreadsheet className="h-4 w-4" />
            Generate report
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <SummaryStat icon={Timer} label="Total" value={secondsToLabel(totalSeconds)} />
          <SummaryStat icon={DollarSign} label="Billable" value={secondsToLabel(billableSeconds)} />
          <SummaryStat
            icon={Clock3}
            label="Entries"
            value={filteredEntries.length.toString().padStart(2, "0")}
          />
        </div>

        <ScrollArea className="h-[360px] pr-2">
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-muted-foreground">No entries for this range yet.</p>
          )}

          <div className="space-y-4">
            {Object.entries(grouped)
              .sort(
                ([a], [b]) => new Date(b).getTime() - new Date(a).getTime(),
              )
              .map(([day, dayEntries]) => (
                <div key={day} className="rounded-xl border border-border/60 bg-card/60 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{day}</p>
                    <p className="text-xs text-muted-foreground">
                      {secondsToLabel(dayEntries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0))}
                    </p>
                  </div>
                  <Separator className="my-2" />
                  <div className="space-y-3">
                    {dayEntries
                      .slice()
                      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                      .map((entry) => (
                        <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 p-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {entry.project_name || "Untitled project"}
                              {entry.task_name ? ` / ${entry.task_name}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">{entry.description || "No description"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(entry.start_time), "p")} –{" "}
                              {entry.end_time ? format(new Date(entry.end_time), "p") : "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-sm font-semibold">
                              <p>{secondsToLabel(entry.duration_seconds ?? 0)}</p>
                              {entry.billable === false ? (
                                <span className="text-xs text-muted-foreground">Non-billable</span>
                              ) : (
                                <span className="text-xs text-emerald-600 dark:text-emerald-300">Billable</span>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </CardContent>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (!open ? closeEdit() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit entry</DialogTitle>
            <DialogDescription>Adjust time, project, task, billing, and description.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={editing.client || UNASSIGNED_CLIENT_LABEL}
                    onValueChange={(val) =>
                      setEditing((prev) =>
                        prev
                          ? {
                              ...prev,
                              client: val,
                              projectId: UNASSIGNED_PROJECT_ID,
                              taskId: null,
                            }
                          : prev,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose client" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Select
                    value={editing.projectId || UNASSIGNED_PROJECT_ID}
                    onValueChange={(val) =>
                      setEditing((prev) => (prev ? { ...prev, projectId: val, taskId: null } : prev))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED_PROJECT_ID}>Unassigned</SelectItem>
                      {(projectsForClient(editing.client) || projects).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.client ? `${p.name} — ${p.client}` : p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Task</Label>
                  <Select
                    value={editing.taskId ?? "unassigned"}
                    onValueChange={(val) =>
                      setEditing((prev) => (prev ? { ...prev, taskId: val === "unassigned" ? null : val } : prev))
                    }
                    disabled={tasksForProject(editing.projectId).length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {tasksForProject(editing.projectId).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start time</Label>
                  <Input
                    type="datetime-local"
                    value={editing.startTime}
                    onChange={(e) => setEditing((prev) => (prev ? { ...prev, startTime: e.target.value } : prev))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End time</Label>
                  <Input
                    type="datetime-local"
                    value={editing.endTime}
                    onChange={(e) => setEditing((prev) => (prev ? { ...prev, endTime: e.target.value } : prev))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="billable"
                  checked={editing.billable ?? true}
                  onCheckedChange={(val) =>
                    setEditing((prev) => (prev ? { ...prev, billable: Boolean(val) } : prev))
                  }
                />
                <Label htmlFor="billable">Billable</Label>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <DialogFooter>
                <Button variant="ghost" onClick={closeEdit} disabled={isUpdating}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
      <Icon className="h-5 w-5 text-primary" />
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}
