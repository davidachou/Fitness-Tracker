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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { samplePolls } from "@/lib/sample-data";
import { toast } from "sonner";
import { BarChart3, Sparkles } from "lucide-react";

type Poll = typeof samplePolls[number];
type SupabasePoll = {
  id: string;
  question: string;
  poll_options: { id: string; label: string; votes?: number }[];
};

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>(samplePolls);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["Yes", "No", "Maybe"]);

  useEffect(() => {
    const supabase = createClient();
    const fetchPolls = async () => {
      const { data } = await supabase.from("polls").select("*, poll_options(*)");
      if (data && data.length > 0) {
        setPolls(
          (data as SupabasePoll[]).map((p) => ({
            id: p.id,
            question: p.question,
            options: p.poll_options.map((opt) => ({
              id: opt.id,
              label: opt.label,
              votes: opt.votes || 0,
            })),
          })),
        );
      }
    };
    fetchPolls();

    const channel = supabase
      .channel("poll-votes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "poll_votes" },
        () => fetchPolls(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const vote = async (pollId: string, optionId: string) => {
    const supabase = createClient();
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
    await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: optionId });
    try {
      await supabase.rpc("increment_vote", { option_id_input: optionId });
    } catch {
      // ignore RPC errors for now
    }
    toast.success("Vote saved");
  };

  const createPoll = async () => {
    if (!question || options.some((o) => !o)) {
      toast.error("Add a question and options");
      return;
    }
    const supabase = createClient();
    const pollId = crypto.randomUUID();
    const newPoll: Poll = {
      id: pollId,
      question,
      options: options.map((label) => ({ id: crypto.randomUUID(), label, votes: 0 })),
    };
    setPolls((prev) => [newPoll, ...prev]);
    await supabase.from("polls").insert({ id: pollId, question });
    await supabase.from("poll_options").insert(
      newPoll.options.map((opt) => ({ ...opt, poll_id: pollId })),
    );
    toast.success("Poll created");
    setQuestion("");
    setOptions(["Yes", "No", "Maybe"]);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Alignment</p>
        <h2 className="text-3xl font-black">Simple Polls</h2>
        <p className="text-muted-foreground">Create and vote with realtime updates.</p>
      </header>

      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle>Create poll</CardTitle>
          <CardDescription>Authenticated users can create and vote.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
          />
          {options.map((opt, idx) => (
            <Input
              key={idx}
              placeholder={`Option ${idx + 1}`}
              value={opt}
              onChange={(e) =>
                setOptions((prev) => prev.map((o, i) => (i === idx ? e.target.value : o)))
              }
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
          ))}
          <Button className="gap-2" onClick={createPoll}>
            <Sparkles className="h-4 w-4" /> Create
          </Button>
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
                    <CardDescription>{total} votes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {poll.options.map((opt) => {
                      const pct = Math.round((opt.votes / total) * 100);
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
                            onClick={() => vote(poll.id, opt.id)}
                          >
                            Vote for {opt.label}
                          </Button>
                        </div>
                      );
                    })}
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

