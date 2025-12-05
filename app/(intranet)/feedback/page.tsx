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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { sampleFeedback } from "@/lib/sample-data";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

type Feedback = (typeof sampleFeedback)[number];

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>(sampleFeedback);
  const [form, setForm] = useState({ message: "", client_name: "", client_email: "" });

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.from("client_feedback").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) setFeedback(data as Feedback[]);
    };
    load();
  }, []);

  const submit = async () => {
    if (!form.message) return toast.error("Message required");
    const supabase = createClient();
    const payload: Feedback = {
      id: crypto.randomUUID(),
      message: form.message,
      client_name: form.client_name || null,
      client_email: form.client_email || null,
      created_at: new Date().toISOString(),
    };
    setFeedback((prev) => [payload, ...prev]);
    await supabase.from("client_feedback").insert(payload);
    toast.success("Feedback submitted");
    setForm({ message: "", client_name: "", client_email: "" });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Voice of client</p>
        <h2 className="text-3xl font-black">Client Feedback Inbox</h2>
        <p className="text-muted-foreground">
          Anonymous by default. Store in Supabase, animate on submit.
        </p>
      </header>

      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle>Submit feedback</CardTitle>
          <CardDescription>Message plus optional client details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="What did the client say?"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              placeholder="Client name (optional)"
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <Input
              placeholder="Client email (optional)"
              value={form.client_email}
              onChange={(e) => setForm((f) => ({ ...f, client_email: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
          </div>
          <Button className="gap-2" onClick={submit}>
            <Send className="h-4 w-4" /> Send anonymously
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <AnimatePresence>
          {feedback.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <Card className="h-full border-white/10 bg-white/5 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Client feedback
                  </CardTitle>
                  <CardDescription>{new Date(item.created_at).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                  <div className="text-xs text-muted-foreground">
                    {item.client_name ? `From ${item.client_name}` : "Anonymous"}
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

