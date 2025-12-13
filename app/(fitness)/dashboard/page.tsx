"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { sampleQuickLinks, sampleProjects, sampleTeamMembers, sampleWins, sampleFeedback } from "@/lib/sample-data";
import { ArrowUpRight, Flame, Link2, MessageSquare, Trophy, KanbanSquare, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";

type QuickLink = (typeof sampleQuickLinks)[number];
type PollOption = { label: string; votes: number | null };
type PollWithOptions = { id: string; question: string; created_at: string; poll_options?: PollOption[] | null };
type Announcement = { id: string; message: string; created_at: string; user_id?: string | null };

export default function DashboardPage() {
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(sampleQuickLinks);
  const [isAdmin, setIsAdmin] = useState(false);
  const { adminUIMode } = useAdminUIMode();
  const [profileChecked, setProfileChecked] = useState(false);
  const [stats, setStats] = useState({
    team: sampleTeamMembers.length,
    projects: sampleProjects.length,
    wins: sampleWins.length,
    feedbackClient: sampleFeedback.filter((f) => f.kind === "client").length,
    feedbackEmployee: sampleFeedback.filter((f) => f.kind === "employee").length,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementForm, setAnnouncementForm] = useState({ message: "", id: "" });
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementDeleting, setAnnouncementDeleting] = useState<string | null>(null);
  const [latestPoll, setLatestPoll] = useState<PollWithOptions | null>(null);

  const fetchAnnouncements = async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAnnouncements(data ?? []);
    } catch (err) {
      console.warn("Announcements fetch failed", err);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    const loadQuickLinks = async () => {
      const { data } = await supabase.from("quick_links").select("*");
      if (data && data.length > 0) {
        setQuickLinks(
          data.map((item) => ({
            id: item.id,
            label: item.label,
            description: item.description,
            icon: item.icon,
            url: item.url,
          })),
        );
      }
    };

    const loadStats = async () => {
      try {
        const [
          { count: teamCount },
          { count: winCount },
          { count: feedbackClient },
          { count: feedbackEmployee },
          { data: clientContribs },
        ] = await Promise.all([
          supabase.from("team_members").select("*", { count: "exact", head: true }),
          supabase.from("wins_posts").select("*", { count: "exact", head: true }),
          supabase.from("feedback_entries").select("*", { count: "exact", head: true }).eq("kind", "client"),
          supabase.from("feedback_entries").select("*", { count: "exact", head: true }).eq("kind", "employee"),
          supabase.rpc("client_contributors"),
        ]);

        const activeClients = new Set<string>();
        (clientContribs as { client_id: string; archived: boolean | null }[] | null)?.forEach((row) => {
          if (!row) return;
          const isArchived = Boolean(row.archived);
          if (!isArchived && row.client_id) {
            activeClients.add(row.client_id);
          }
        });

        setStats((prev) => ({
          team: teamCount ?? prev.team,
          projects: activeClients.size || prev.projects,
          wins: winCount ?? prev.wins,
          feedbackClient: feedbackClient ?? prev.feedbackClient,
          feedbackEmployee: feedbackEmployee ?? prev.feedbackEmployee,
        }));
      } catch (error) {
        console.warn("loadStats failed", error);
      }
    };

    const loadAdminFlag = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (profile?.is_admin) {
        setIsAdmin(true);
      }
    };

    const loadLatestPoll = async () => {
      const { data } = await supabase
        .from("polls")
        .select("id, question, created_at, poll_options(label, votes)")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) setLatestPoll(data as unknown as PollWithOptions);
    };

    loadQuickLinks();
    loadStats();
    loadAdminFlag();
    fetchAnnouncements();
    loadLatestPoll();
  }, []);

  // Check and create profile for invited users
  useEffect(() => {
    const checkAndCreateProfile = async () => {
      if (profileChecked) return;

      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) return;

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Create profile using the API
        console.log('Creating profile for invited user:', user.email);
        const response = await fetch('/api/dashboard/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            userMetadata: user.user_metadata
          })
        });

        if (response.ok) {
          console.log('Profile created successfully');
        } else {
          console.error('Failed to create profile:', await response.text());
        }
      }

      setProfileChecked(true);
    };

    checkAndCreateProfile();
  }, [profileChecked]);

  const saveAnnouncement = async () => {
    const supabase = createClient();
    if (!announcementForm.message.trim()) return;
    setAnnouncementSaving(true);
    const id = announcementForm.id || crypto.randomUUID();
    const payload = { id, message: announcementForm.message.trim() };
    if (announcementForm.id) {
      await supabase.from("announcements").update(payload).eq("id", id);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, ...payload } : a)));
      toast.success("Announcement updated");
    } else {
      const { data } = await supabase.from("announcements").insert(payload).select().single();
      setAnnouncements((prev) => [ (data as Announcement) ?? payload, ...prev ]);
      toast.success("Announcement added");
    }
    setAnnouncementForm({ message: "", id: "" });
    setAnnouncementSaving(false);
    fetchAnnouncements();
  };

  const editAnnouncement = (a: Announcement) => {
    setAnnouncementForm({ message: a.message, id: a.id });
  };

  const deleteAnnouncement = async (id: string) => {
    const supabase = createClient();
    setAnnouncementDeleting(id);
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setAnnouncementDeleting(null);
    toast.success("Announcement deleted");
    fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-pop-2/30 via-primary/30 to-pop-1/40 p-8 text-foreground shadow-2xl dark:border-border dark:from-pop-2/25 dark:via-primary/25 dark:to-pop-1/30"
        data-tour="tour-hero"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-foreground">
            <Flame className="h-4 w-4 text-primary dark:text-amber-300" />
            Fitness Tracker
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Everything the team needs, in one focused workspace.
          </h1>
          <p className="text-lg text-muted-foreground dark:text-white/80">
            Fast access to people, knowledge, projects, wins, polls, feedback, and bookings—secured with Google OAuth and powered by Supabase.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/team">
                Meet the team <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/knowledge">
                Explore knowledge hub <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
              <Button asChild size="lg">
                <Link href="/admin/invite">
                  Add Clients <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </motion.div>
        <GradientOrbs />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Active projects"
          value={stats.projects}
          accent="from-pop-1/70 via-pop-3/30 to-pop-2/70"
          href="/projects"
          dataTour="tour-stat-projects"
          icon={KanbanSquare}
        />
        <StatCard
          title="Wins logged"
          value={stats.wins}
          accent="from-pop-1/60 via-secondary/30 to-pop-2/80"
          href="/wins"
          dataTour="tour-stat-wins"
          icon={Trophy}
        />
        <StatCard
          title="Client feedback"
          value={stats.feedbackClient}
          accent="from-pop-3/60 via-gradient-3/30 to-pop-2/75"
          href="/feedback"
          dataTour="tour-stat-feedback-client"
          icon={MessageSquare}
        />
        <StatCard
          title="Employee feedback"
          value={stats.feedbackEmployee}
          accent="from-pop-4/60 via-primary/35 to-pop-2/80"
          href="/feedback"
          dataTour="tour-stat-feedback-employee"
          icon={Users}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border bg-card/90 text-foreground backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>One-tap access to the essentials</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary dark:bg-amber-500/20 dark:text-amber-200">
              Live
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link, idx) => (
              <motion.a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="group relative flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-lg transition hover:-translate-y-1 hover:shadow-primary/20 dark:border-white/10 dark:bg-gradient-to-br dark:from-white/5 dark:to-white/10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                data-tour={idx === 0 ? "tour-quick-links" : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner dark:bg-white/10 dark:text-white">
                    <Link2 className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground dark:text-white">{link.label}</p>
                    <p className="text-xs text-muted-foreground dark:text-white/70">{link.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground dark:text-white/70 min-w-0">
                  <span className="truncate" title={link.url}>
                    {link.url.replace(/^https?:\/\//, "")}
                  </span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </motion.a>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/90 text-foreground backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white" data-tour="tour-momentum">
          <CardHeader>
            <CardTitle>Latest poll</CardTitle>
            <CardDescription>{latestPoll ? latestPoll.question : "No polls yet"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestPoll?.poll_options?.length ? (
              latestPoll.poll_options.map((opt, idx) => (
                <div key={`${opt.label}-${idx}`}>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{opt.label}</span>
                    <span className="text-muted-foreground">{opt.votes ?? 0} votes</span>
                  </div>
                  <Progress value={Math.min(100, (opt.votes ?? 0) * 10)} className="mt-1" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Create a poll to see it here.</p>
            )}
            <Button variant="outline" className="w-full border-primary/40 text-primary" asChild>
              <Link href="/polls">
                Go to Polls <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
        <Card className="border-border bg-card text-foreground backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
          <CardHeader>
            <CardTitle>Manage announcements</CardTitle>
            <CardDescription>Add, edit, or delete announcement strings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Announcement text"
              value={announcementForm.message}
              onChange={(e) => setAnnouncementForm((f) => ({ ...f, message: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <div className="flex gap-2">
              <Button onClick={saveAnnouncement} disabled={announcementSaving}>
                {announcementForm.id ? "Save announcement" : "Add announcement"}
              </Button>
              {announcementForm.id && (
                <Button variant="ghost" onClick={() => setAnnouncementForm({ message: "", id: "" })}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm dark:border-white/20">
                  <span className="text-muted-foreground">{a.message}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => editAnnouncement(a)}>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteAnnouncement(a.id)}
                      disabled={announcementDeleting === a.id}
                    >
                      {announcementDeleting === a.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  accent,
  href,
  dataTour,
  icon: Icon,
}: {
  title: string;
  value: number;
  accent: string;
  href: string;
  dataTour?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="group" data-tour={dataTour}>
      <Card className="relative overflow-hidden border-border bg-card text-foreground backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white">
        <div className={`absolute inset-0 opacity-60 blur-2xl bg-gradient-to-br ${accent}`} />
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
            <Icon className="h-4 w-4 text-primary" /> {title}
          </CardDescription>
          <CardTitle className="text-3xl font-black">{value}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Tap to dive in</span>
          <ArrowUpRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  );
}

// Removed unused decorative sparkle.

function GradientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute right-10 top-10 h-28 w-28 animate-pulse rounded-full bg-pop-1/30 blur-3xl" />
      <div className="absolute -left-10 bottom-0 h-40 w-40 animate-pulse rounded-full bg-pop-2/25 blur-3xl" />
      <div className="absolute left-20 top-5 h-32 w-32 animate-pulse rounded-full bg-pop-4/20 blur-3xl" />
    </div>
  );
}
