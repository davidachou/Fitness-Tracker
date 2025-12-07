"use client";

import { useMemo, useState } from "react";
import { format, intervalToDuration, isAfter, startOfToday, startOfWeek } from "date-fns";
import { Clock3, DollarSign, FileSpreadsheet, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export type TimelineEntry = {
  id: string;
  project_name?: string | null;
  client?: string | null;
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
};

function secondsToLabel(seconds = 0) {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  const hrs = duration.hours?.toString().padStart(2, "0") ?? "00";
  const mins = duration.minutes?.toString().padStart(2, "0") ?? "00";
  return `${hrs}:${mins}`;
}

export function TimeTimeline({ entries, onGenerateReport }: TimeTimelineProps) {
  const [tab, setTab] = useState<"today" | "week" | "all">("today");

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

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">Entries grouped by day</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={tab} onValueChange={(val) => setTab(val as typeof tab)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
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
                          <div>
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
                          <div className="text-right text-sm font-semibold">
                            <p>{secondsToLabel(entry.duration_seconds ?? 0)}</p>
                            {entry.billable === false ? (
                              <span className="text-xs text-muted-foreground">Non-billable</span>
                            ) : (
                              <span className="text-xs text-emerald-600 dark:text-emerald-300">Billable</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
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


