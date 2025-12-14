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
import { ArrowUpRight, Flame, Link2, MessageSquare, Trophy, Users, X } from "lucide-react";
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
          { count: activeClientsCount },
          { count: blogPostsCount },
          { count: feedbackClient },
        ] = await Promise.all([
          supabase.from("fitness_clients").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("wins_posts").select("*", { count: "exact", head: true }),
          supabase.from("feedback_entries").select("*", { count: "exact", head: true }).eq("kind", "client"),
        ]);

        setStats((prev) => ({
          team: prev.team, // Keep existing team count for now
          projects: activeClientsCount ?? prev.projects,
          wins: blogPostsCount ?? prev.wins,
          feedbackClient: feedbackClient ?? prev.feedbackClient,
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
      const { data: profiles } = await supabase.from("profiles").select("is_admin").eq("id", user.id);
      if (profiles && profiles.length > 0 && profiles[0].is_admin) {
        setIsAdmin(true);
      }
    };

    const loadLatestPoll = async () => {
      const { data } = await supabase
        .from("polls")
        .select("id, question, created_at, poll_options(label, votes)")
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) setLatestPoll(data[0] as unknown as PollWithOptions);
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

      if (authError || !user) {
        console.log('No authenticated user, skipping profile check');
        return;
      }

      console.log('Checking profile for user:', user.id, user.email);

      // Check if profile exists
      const { data: existingProfiles, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', user.id);

      if (profileCheckError) {
        console.error('Error checking existing profile:', profileCheckError);
        setProfileChecked(true);
        return;
      }

      console.log('Existing profiles found:', existingProfiles?.length || 0);

      if (!existingProfiles || existingProfiles.length === 0) {
        // Create profile using the API
        console.log('No profile found, creating profile for user:', user.email, 'with metadata:', user.user_metadata);
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
          console.log('Profile created successfully via dashboard fallback');
        } else {
          const errorText = await response.text();
          console.error('Failed to create profile via dashboard:', errorText);
          // Try to show user-friendly error
          if (!errorText.includes('Profile already exists')) {
            toast.error('Failed to create user profile. Please contact support.');
          }
        }
      } else {
        console.log('Profile already exists for user:', user.id);
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
            Your Fitness Journey Hub
          </h1>
          <p className="text-lg text-muted-foreground dark:text-white/80">
            Track workouts, connect with trainers, explore fitness content, and monitor your progress—all in one secure platform.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/fitness">
                Start Workout <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
              <Button asChild size="lg">
                <Link href="/fitness-clients">
                  Manage Clients <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
              <Button asChild size="lg">
                <Link href="/admin/invite">
                  Invite Users <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </motion.div>
        <GradientOrbs />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
          <StatCard
            title="Active Clients"
            value={stats.projects}
            accent="from-pop-1/70 via-pop-3/30 to-pop-2/70"
            href="/connections"
            dataTour="tour-stat-projects"
            icon={Users}
          />
        )}
        <StatCard
          title="Blog Posts"
          value={stats.wins}
          accent="from-pop-1/60 via-secondary/30 to-pop-2/80"
          href="/wins"
          dataTour="tour-stat-wins"
          icon={Trophy}
        />
        {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
          <StatCard
            title="Client Feedback"
            value={stats.feedbackClient}
            accent="from-pop-3/60 via-gradient-3/30 to-pop-2/75"
            href="/feedback"
            dataTour="tour-stat-feedback-client"
            icon={MessageSquare}
          />
        )}
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
