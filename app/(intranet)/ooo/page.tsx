"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sampleOOOEvents } from "@/lib/sample-data";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarCheck } from "lucide-react";

type OOOEvent = (typeof sampleOOOEvents)[number];

export default function OOOPage() {
  const [events, setEvents] = useState<OOOEvent[]>(sampleOOOEvents);
  const [form, setForm] = useState({
    person: "",
    type: "OOO",
    location: "",
    start_date: "",
    end_date: "",
    notes: "",
  });

  useEffect(() => {
    const supabase = createClient();
    const fetchEvents = async () => {
      const { data } = await supabase.from("ooo_events").select("*").order("start_date");
      if (data && data.length > 0) {
        setEvents(data as OOOEvent[]);
      }
    };
    fetchEvents();
  }, []);

  const submit = async () => {
    if (!form.person || !form.start_date || !form.end_date) {
      toast.error("Add person and dates");
      return;
    }
    const supabase = createClient();
    const payload: OOOEvent = { id: crypto.randomUUID(), ...form };
    setEvents((prev) => [...prev, payload]);
    await supabase.from("ooo_events").insert(payload);
    toast.success("Event added");
    setForm({
      person: "",
      type: "OOO",
      location: "",
      start_date: "",
      end_date: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Coverage</p>
        <h2 className="text-3xl font-black">Out-of-Office & Travel</h2>
        <p className="text-muted-foreground">
          Embedded Google Calendar + Supabase-backed event log.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle>Shared Calendar</CardTitle>
            <CardDescription>Stay synced with coverage and travel.</CardDescription>
          </CardHeader>
          <CardContent className="h-[520px] overflow-hidden rounded-xl border border-white/10">
            <iframe
              title="OOO Calendar"
              src="https://calendar.google.com/calendar/embed?src=placeholder-calendar-id%40group.calendar.google.com"
              className="h-full w-full rounded-xl border-0"
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle>Add event</CardTitle>
            <CardDescription>Supabase insert + calendar sync placeholder.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Person"
              value={form.person}
              onChange={(e) => setForm((f) => ({ ...f, person: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <Input
              placeholder="Type (OOO / Travel)"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <Input
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="border-border bg-background text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white"
              />
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="border-border bg-background text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white"
              />
            </div>
            <Input
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <Button className="w-full" onClick={submit}>
              Add event
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                    {event.person}
                  </CardTitle>
                  <CardDescription>{event.notes || "Coverage note"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-white/10">
                      {event.type}
                    </Badge>
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-100">
                      {event.location || "TBD"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {event.start_date} → {event.end_date}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

