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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { sampleFeedback } from "@/lib/sample-data";
import { toast } from "sonner";
import { MessageSquare, Send, Pencil, Trash2, X } from "lucide-react";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";

type FeedbackKind = "client";

type Feedback = {
  id: string;
  kind: FeedbackKind;
  message: string;
  submitter_name: string | null;
  user_id?: string | null;
  is_anonymous: boolean;
  created_at: string;
};

export default function FeedbackPage() {
  const [entries, setEntries] = useState<Feedback[]>(sampleFeedback as Feedback[]);
  const [form, setForm] = useState({ message: "", is_anonymous: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { adminUIMode } = useAdminUIMode();

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      try {
        const [{ data: rows }, { data: userData }] = await Promise.all([
          supabase.from("feedback_entries").select("*").order("created_at", { ascending: false }),
          supabase.auth.getUser(),
        ]);

        if (rows && rows.length > 0) setEntries(rows as Feedback[]);
        if (userData?.user?.id) {
          setUserId(userData.user.id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin, full_name")
            .eq("id", userData.user.id)
            .single();
          setIsAdmin(Boolean(profile?.is_admin));
          setUserName(profile?.full_name ?? null);
        }
      } catch (err) {
        console.warn("feedback load skipped", err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!editingId) {
      resetForm();
    }
  }, [editingId]);

  const resetForm = () => {
    setForm({ message: "", is_anonymous: false });
    setEditingId(null);
    setIsSaving(false);
  };

  const filtered = entries.filter((e) => e.kind === "client");

  const canEdit = (entry: Feedback) => shouldShowAdminFeatures(isAdmin, adminUIMode) || (!!userId && entry.user_id === userId);

  const submit = async () => {
    const supabase = createClient();
    if (!form.message.trim()) return toast.error("Message required");
    if (!userId) return toast.error("You must be logged in to submit feedback");

    setIsSaving(true);
    const id = editingId ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const existing = entries.find((e) => e.id === id);

    const submitterName = form.is_anonymous ? "Anonymous" : (userName || "Someone");

    const basePayload = {
      kind: "client",
      message: form.message.trim(),
      submitter_name: submitterName,
      is_anonymous: form.is_anonymous,
    };

    const payload = editingId
      ? { ...basePayload, id, user_id: existing?.user_id ?? userId, created_at: existing?.created_at ?? now } as Feedback
      : basePayload; // For inserts, let Supabase handle id, user_id, and created_at

    console.log("Submitting feedback payload:", payload);
    console.log("User authenticated:", !!userId);

    try {
      if (editingId) {
        const { data, error } = await supabase.from("feedback_entries").update(payload).eq("id", id);
        console.log("Update result:", data, "Error:", error);
        if (error) throw error;
        if (data && data[0]) {
          setEntries((prev) => prev.map((e) => (e.id === id ? data[0] as Feedback : e)));
        }
        toast.success("Feedback updated");
      } else {
        const { data, error } = await supabase.from("feedback_entries").insert(payload);
        console.log("Insert result:", data, "Error:", error);
        if (error) throw error;
        if (data && data[0]) {
          setEntries((prev) => [data[0] as Feedback, ...prev]);
        }
        toast.success("Feedback submitted");
      }

      resetForm();
    } catch (error: unknown) {
      console.error("Feedback submission error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to submit feedback: ${errorMessage}`);
      setIsSaving(false);
    }
  };

  const startEdit = (entry: Feedback) => {
    setEditingId(entry.id);
    setForm({
      message: entry.message,
      is_anonymous: entry.is_anonymous,
    });
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    const supabase = createClient();
    await supabase.from("feedback_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (editingId === id) resetForm();
    setIsDeleting(null);
    toast.success("Feedback deleted");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Client feedback</p>
        <h2 className="text-3xl font-black">Feedback Inbox</h2>
        <p className="text-muted-foreground">Client feedback and testimonials; edit/delete if you own it or are admin.</p>
      </header>

        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle>{editingId ? "Edit testimonial" : "Share testimonial"}</CardTitle>
            <CardDescription>
              Share your fitness success story or testimonial. Your name will be automatically included unless you choose to submit anonymously.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Share your fitness journey and results..."
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />

            <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground dark:border-white/20">
              <Checkbox
                id="anon"
                checked={form.is_anonymous}
                onCheckedChange={(val) => setForm((f) => ({ ...f, is_anonymous: Boolean(val) }))}
              />
              <label htmlFor="anon" className="cursor-pointer select-none">
                Submit anonymously
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={submit} className="gap-2" disabled={isSaving}>
                <Send className="h-4 w-4" />
                {editingId ? "Save changes" : "Send"}
              </Button>
              {editingId && (
                <Button variant="ghost" className="gap-2" onClick={resetForm}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence>
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <Card className="h-full border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold">
                            {item.submitter_name ?? "Anonymous"}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </CardDescription>
                        </div>
                      </div>
                      {canEdit(item) && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-8 w-8 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            disabled={isDeleting === item.id}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="relative">
                      <div className="absolute -left-2 -top-2 text-4xl text-primary/20 leading-none">&quot;</div>
                      <p className="text-sm text-foreground pl-4 italic">{item.message}</p>
                      <div className="absolute -right-1 -bottom-4 text-4xl text-primary/20 leading-none">&quot;</div>
                    </div>
                    {item.is_anonymous && (
                      <div className="text-xs text-muted-foreground italic">Submitted anonymously</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
    </div>
  );
}

