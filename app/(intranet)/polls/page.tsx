"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarChart3, Sparkles } from "lucide-react";
import { format } from "date-fns";

type PollOption = { id: string; label: string; votes: number };
type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  created_by?: string | null;
  created_at?: string | null;
  creator_name?: string | null;
};
type SupabasePoll = {
  id: string;
  question: string;
  created_by?: string | null;
  created_at?: string | null;
  profiles?: { full_name?: string | null } | null;
  poll_options: { id: string; label: string; votes?: number }[];
};

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["Yes", "No"]);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase.from("profiles").select("is_admin, full_name").eq("id", uid).single();
        setIsAdmin(Boolean(profile?.is_admin));
        setUserName(profile?.full_name ?? data.user?.email ?? null);
      } else {
        setUserName(null);
      }
    };
    loadUser();
  }, [supabase]);

  useEffect(() => {
    const fetchPolls = async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("id, question, created_by, created_at, profiles(full_name), poll_options(id, label, votes)")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load polls", error);
      } else if (data) {
        setPolls(
          (data as SupabasePoll[]).map((p) => ({
            id: p.id,
            question: p.question,
            created_by: p.created_by ?? null,
            created_at: p.created_at ?? null,
            creator_name: p.profiles?.full_name ?? null,
            options: p.poll_options
              .slice()
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((opt) => ({
                id: opt.id,
                label: opt.label,
                votes: opt.votes || 0,
              })),
          })),
        );
      }
    };

    const fetchUserVotes = async () => {
      if (!userId) return;
      const { data } = await supabase.from("poll_votes").select("poll_id, option_id").eq("user_id", userId);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((row) => {
          map[row.poll_id] = row.option_id;
        });
        setUserVotes(map);
      }
    };

    fetchPolls();
    fetchUserVotes();

    const channel = supabase
      .channel("polls-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => {
        fetchPolls();
        fetchUserVotes();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_options" }, () => fetchPolls())
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => fetchPolls())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const vote = async (pollId: string, optionId: string) => {
    if (userVotes[pollId]) {
      toast.error("You already voted on this poll");
      return;
    }
    if (!userId) {
      toast.error("Sign in to vote");
      return;
    }
    setPolls((prev) =>
      prev.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              options: poll.options.map((opt) =>
                opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt,
              ),
            }
          : poll,
      ),
    );
    await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: optionId, user_id: userId });
    const { error } = await supabase.rpc("increment_poll_option_vote", { option_id_input: optionId });
    if (error) {
      console.error("Vote update failed", error);
      toast.error("Could not save vote");
    } else {
      setUserVotes((prev) => ({ ...prev, [pollId]: optionId }));
      toast.success("Vote saved");
    }
  };

  const retractVote = async (pollId: string, optionId: string) => {
    if (!userVotes[pollId]) return;
    // optimistic rollback
    setPolls((prev) =>
      prev.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              options: poll.options.map((opt) =>
                opt.id === optionId ? { ...opt, votes: Math.max(0, opt.votes - 1) } : opt,
              ),
            }
          : poll,
      ),
    );
    setUserVotes((prev) => {
      const next = { ...prev };
      delete next[pollId];
      return next;
    });
    const { error: deleteError } = await supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("user_id", userId);
    const { error: decError } = await supabase.rpc("decrement_poll_option_vote", { option_id_input: optionId });
    if (deleteError || decError) {
      console.error("Retract failed", deleteError, decError);
      toast.error("Could not retract vote");
      // refetch to reconcile
      const { data } = await supabase
        .from("polls")
        .select("id, question, created_by, created_at, profiles(full_name), poll_options(id, label, votes)")
        .order("created_at", { ascending: false });
      if (data) {
        setPolls(
          (data as SupabasePoll[]).map((p) => ({
            id: p.id,
            question: p.question,
            created_by: p.created_by ?? null,
            created_at: p.created_at ?? null,
            creator_name: p.profiles?.full_name ?? null,
            options: p.poll_options
              .slice()
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((opt) => ({
                id: opt.id,
                label: opt.label,
                votes: opt.votes || 0,
              })),
          })),
        );
      }
    } else {
      toast.success("Vote retracted");
    }
  };

  const createPoll = async () => {
    if (!question || options.length < 2 || options.some((o) => !o.trim())) {
      toast.error("Add a question and options");
      return;
    }
    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    const pollId = crypto.randomUUID();
    const optionRows = options.map((label) => ({ id: crypto.randomUUID(), poll_id: pollId, label: label.trim() }));

    const { error: pollError } = await supabase.from("polls").insert({
      id: pollId,
      question: question.trim(),
      created_by: userData?.user?.id ?? null,
    });
    const { error: optError } = await supabase.from("poll_options").insert(optionRows);

    if (pollError || optError) {
      toast.error("Could not create poll");
    } else {
      setPolls((prev) => [
        {
          id: pollId,
          question: question.trim(),
          created_by: userData?.user?.id ?? null,
          created_at: new Date().toISOString(),
          creator_name: userName ?? userData?.user?.email ?? null,
          options: optionRows.map((o) => ({ id: o.id, label: o.label, votes: 0 })),
        },
        ...prev,
      ]);
      toast.success("Poll created");
      setQuestion("");
      setOptions(["Yes", "No"]);
    }
    setCreating(false);
  };

  const startEdit = (poll: Poll) => {
    setEditingPollId(poll.id);
    setQuestion(poll.question);
    setOptions(poll.options.map((o) => o.label));
  };

  const updatePoll = async () => {
    if (!editingPollId) return;
    if (!question || options.length < 2 || options.some((o) => !o.trim())) {
      toast.error("Add a question and options");
      return;
    }
    setCreating(true);
    const optionRows = options.map((label) => ({ id: crypto.randomUUID(), poll_id: editingPollId, label: label.trim() }));
    const { error: pollError } = await supabase.from("polls").update({ question: question.trim() }).eq("id", editingPollId);
    const { error: deleteError } = await supabase.from("poll_options").delete().eq("poll_id", editingPollId);
    const { error: optError } = await supabase.from("poll_options").insert(optionRows);
    if (pollError || deleteError || optError) {
      toast.error("Could not update poll");
    } else {
      setPolls((prev) =>
        prev.map((p) =>
          p.id === editingPollId
            ? { ...p, question: question.trim(), options: optionRows.map((o) => ({ id: o.id, label: o.label, votes: 0 })) }
            : p,
        ),
      );
      toast.success("Poll updated");
      setEditingPollId(null);
      setQuestion("");
      setOptions(["Yes", "No"]);
    }
    setCreating(false);
  };

  const deletePoll = async (pollId: string) => {
    const { error } = await supabase.from("polls").delete().eq("id", pollId);
    if (error) {
      toast.error("Could not delete poll");
      return;
    }
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
    toast.success("Poll deleted");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Alignment</p>
        <h2 className="text-3xl font-black">Polls</h2>
        <p className="text-muted-foreground">Create and vote with realtime updates. Options up to 10.</p>
      </header>

      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle>{editingPollId ? "Edit poll" : "Create poll"}</CardTitle>
          <CardDescription>Authenticated users can create and vote. Options up to 10.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
          />
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={(e) => setOptions((prev) => prev.map((o, i) => (i === idx ? e.target.value : o)))}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
              />
              {options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}
                  className="shrink-0"
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOptions((prev) => [...prev, "New option"])}
              disabled={options.length >= 10}
            >
              Add option
            </Button>
            <Button className="gap-2" onClick={editingPollId ? updatePoll : createPoll} disabled={creating}>
              <Sparkles className="h-4 w-4" /> {creating ? "Saving..." : editingPollId ? "Update" : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <AnimatePresence>
          {polls.map((poll, idx) => {
            const total = poll.options.reduce((sum, o) => sum + o.votes, 0) || 1;
            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="h-full border-white/10 bg-white/5 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      {poll.question}
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between gap-2">
                      <span>{total} votes</span>
                      {poll.created_at && (
                        <span className="text-[11px] text-muted-foreground">
                          {poll.creator_name ? `${poll.creator_name} · ` : ""}
                          {format(new Date(poll.created_at), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {poll.options.map((opt) => {
                      const pct = Math.round((opt.votes / total) * 100);
                      const userPicked = userVotes[poll.id] === opt.id;
                      return (
                        <div key={opt.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span>{opt.label}</span>
                            <Badge variant="secondary" className="bg-white/10">
                              {pct}%
                            </Badge>
                          </div>
                          <Progress value={pct} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => (userPicked ? retractVote(poll.id, opt.id) : vote(poll.id, opt.id))}
                            disabled={!userPicked && Boolean(userVotes[poll.id])}
                          >
                            {userPicked ? "Undo vote" : userVotes[poll.id] ? "Already voted" : `Vote for ${opt.label}`}
                          </Button>
                        </div>
                      );
                    })}
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEdit(poll)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deletePoll(poll.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

