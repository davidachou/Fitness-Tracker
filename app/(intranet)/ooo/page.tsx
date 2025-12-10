"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const CALENDAR_SRC =
  "https://calendar.google.com/calendar/embed?src=c_6292f587a9ed663aa9d990a979a28d750b2242c117472b23fc95c82bf8c896c7%40group.calendar.google.com&ctz=America%2FChicago";

export default function OOOPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Company Calendar</p>
        <h2 className="text-3xl font-black">Company Calendar</h2>
        <p className="text-muted-foreground">Shared Google Calendar for OOO, travel, and key dates.</p>
      </header>

      <Card className="overflow-hidden border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Shared calendar</CardTitle>
            <CardDescription>Company-wide calendar for OOO, travel, and key dates.</CardDescription>
          </div>
          <a
            href={CALENDAR_SRC}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Open in Google Calendar
            <ExternalLink className="h-4 w-4" />
          </a>
        </CardHeader>
        <CardContent className="h-[620px] overflow-hidden rounded-xl border border-white/10">
          <iframe
            title="Company Calendar"
            src={CALENDAR_SRC}
            className="h-full w-full rounded-xl border-0"
            scrolling="no"
          />
        </CardContent>
      </Card>
    </div>
  );
}

