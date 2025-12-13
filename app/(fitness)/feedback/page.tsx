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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { sampleFeedback } from "@/lib/sample-data";
import { toast } from "sonner";
import { MessageSquare, Send, Pencil, Trash2, X } from "lucide-react";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";

type FeedbackKind = "client" | "employee";

type Feedback = {
  id: string;
  kind: FeedbackKind;
  message: string;
  client_org: string | null;
  client_person: string | null;
  submitter_name: string | null;
  user_id?: string | null;
  is_anonymous: boolean;
  created_at: string;
};

export default function FeedbackPage() {
  const [entries, setEntries] = useState<Feedback[]>(sampleFeedback as Feedback[]);
  const [tab, setTab] = useState<FeedbackKind>("client");
  const [form, setForm] = useState({ message: "", client_org: "", client_person: "", is_anonymous: false });
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
  }, [tab, editingId]);

  const resetForm = () => {
    setForm({ message: "", client_org: "", client_person: "", is_anonymous: false });
    setEditingId(null);
    setIsSaving(false);
  };

  const filtered = entries.filter((e) => e.kind === tab);

  const canEdit = (entry: Feedback) => shouldShowAdminFeatures(isAdmin, adminUIMode) || (!!userId && entry.user_id === userId);

  const submit = async () => {
    const supabase = createClient();
    if (!form.message.trim()) return toast.error("Message required");
    if (tab === "client" && !form.client_org.trim()) return toast.error("Client name (org) is required");

    setIsSaving(true);
    const id = editingId ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const existing = entries.find((e) => e.id === id);

    const payload: Feedback = {
      id,
      kind: tab,
      message: form.message.trim(),
      client_org: tab === "client" ? form.client_org.trim() : null,
      client_person: tab === "client" && form.client_person.trim() ? form.client_person.trim() : null,
      submitter_name: form.is_anonymous && tab === "employee" ? "Anonymous" : userName || "Someone",
      user_id: existing?.user_id ?? userId,
      is_anonymous: tab === "employee" ? form.is_anonymous : false,
      created_at: existing?.created_at ?? now,
    };

    if (editingId) {
      await supabase.from("feedback_entries").update(payload).eq("id", id);
      setEntries((prev) => prev.map((e) => (e.id === id ? payload : e)));
      toast.success("Feedback updated");
    } else {
      await supabase.from("feedback_entries").insert(payload);
      setEntries((prev) => [payload, ...prev]);
      toast.success("Feedback submitted");
    }

    resetForm();
  };

  const startEdit = (entry: Feedback) => {
    setEditingId(entry.id);
    setTab(entry.kind);
    setForm({
      message: entry.message,
      client_org: entry.client_org ?? "",
      client_person: entry.client_person ?? "",
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
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Voice of org</p>
        <h2 className="text-3xl font-black">Feedback Inbox</h2>
        <p className="text-muted-foreground">Separate client and employee streams; edit/delete if you own it or are admin.</p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FeedbackKind)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="client">Client feedback</TabsTrigger>
          <TabsTrigger value="employee">Employee feedback</TabsTrigger>
        </TabsList>

        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle>{editingId ? "Edit feedback" : tab === "client" ? "Submit client feedback" : "Submit employee feedback"}</CardTitle>
            <CardDescription>
              {tab === "client"
                ? "Org name required; person is optional. Shows submitter name and date."
                : "Optionally submit anonymously; shows submitter name unless anonymous."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder={tab === "client" ? "What did the client say?" : "Share your feedback"}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />

            {tab === "client" ? (
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Client name / org (required)"
                  value={form.client_org}
                  onChange={(e) => setForm((f) => ({ ...f, client_org: e.target.value }))}
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
                />
                <Input
                  placeholder="Client person (optional)"
                  value={form.client_person}
                  onChange={(e) => setForm((f) => ({ ...f, client_person: e.target.value }))}
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
                />
              </div>
            ) : (
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
            )}

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
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      {item.kind === "client" ? "Client feedback" : "Employee feedback"}
                    </CardTitle>
                    <CardDescription>
                      {new Date(item.created_at).toLocaleString()} • {item.submitter_name ?? "Unknown"}
                    </CardDescription>
                    {canEdit(item) && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting === item.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting === item.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                    {item.kind === "client" && (
                      <div className="text-xs text-muted-foreground">
                        {item.client_org ? `Org: ${item.client_org}` : "Org not provided"}
                        {item.client_person ? ` • Person: ${item.client_person}` : ""}
                      </div>
                    )}
                    {item.kind === "employee" && item.is_anonymous && (
                      <div className="text-xs text-muted-foreground">Submitted anonymously</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}

