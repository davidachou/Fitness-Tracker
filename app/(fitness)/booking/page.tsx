"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, Event } from "react-big-calendar";
import { format } from "date-fns/format";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { sampleBookings } from "@/lib/sample-data";
import { toast } from "sonner";
import { CalendarRange, Sparkles } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";

type Booking = (typeof sampleBookings)[number];

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function BookingPage() {
  const [bookings, setBookings] = useState<Booking[]>(sampleBookings);
  const [form, setForm] = useState({
    resource: "Room A",
    start: "",
    end: "",
  });

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.from("resource_bookings").select("*");
      if (data && data.length > 0) setBookings(data as Booking[]);
    };
    load();
  }, []);

  const events: Event[] = useMemo(
    () =>
      bookings.map((b) => ({
        id: b.id,
        title: `${b.resource} — ${b.booked_by}`,
        start: new Date(b.start),
        end: new Date(b.end),
      })),
    [bookings],
  );

  const submit = async () => {
    if (!form.start || !form.end) {
      toast.error("Add start and end time");
      return;
    }
    const supabase = createClient();
    const newBooking: Booking = {
      id: crypto.randomUUID(),
      resource: form.resource,
      start: form.start,
      end: form.end,
      booked_by: "You",
    };
    setBookings((prev) => [...prev, newBooking]);
    await supabase.from("resource_bookings").insert(newBooking);
    toast.success("Resource booked");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Reserve</p>
        <h2 className="text-3xl font-black">Resource Booking</h2>
        <p className="text-muted-foreground">
          Reserve rooms or hardware. Supabase-backed, calendar visuals via react-big-calendar.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle>Book a resource</CardTitle>
            <CardDescription>Select a placeholder resource and times.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={form.resource}
              onValueChange={(resource) => setForm((f) => ({ ...f, resource }))}
            >
              <SelectTrigger className="border-border bg-background text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Room A">Room A</SelectItem>
                <SelectItem value="Room B">Room B</SelectItem>
                <SelectItem value="Laptop 1">Laptop 1</SelectItem>
                <SelectItem value="Laptop 2">Laptop 2</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="datetime-local"
              value={form.start}
              onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
              className="border-border bg-background text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white"
            />
            <Input
              type="datetime-local"
              value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
              className="border-border bg-background text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white"
            />
            <Button onClick={submit} className="gap-2">
              <CalendarRange className="h-4 w-4" /> Book slot
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Calendar
            </CardTitle>
            <CardDescription>Drag to explore the week.</CardDescription>
          </CardHeader>
          <CardContent className="h-[520px]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full rounded-xl border border-white/10 bg-white/5 p-2"
            >
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                popup
              />
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

