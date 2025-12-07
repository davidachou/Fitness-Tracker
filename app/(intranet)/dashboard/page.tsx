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
import {
  sampleQuickLinks,
  sampleProjects,
  sampleTeamMembers,
  sampleWins,
} from "@/lib/sample-data";
import { ArrowUpRight, Flame, Link2, Rocket, Wand2 } from "lucide-react";

type QuickLink = (typeof sampleQuickLinks)[number];

export default function DashboardPage() {
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(sampleQuickLinks);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    team: sampleTeamMembers.length,
    projects: sampleProjects.length,
    wins: sampleWins.length,
  });

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
      const [{ count: teamCount }, { count: projCount }, { count: winCount }] =
        await Promise.all([
          supabase.from("team_members").select("*", { count: "exact", head: true }),
          supabase.from("projects").select("*", { count: "exact", head: true }),
          supabase.from("wins_posts").select("*", { count: "exact", head: true }),
        ]);

      setStats((prev) => ({
        team: teamCount ?? prev.team,
        projects: projCount ?? prev.projects,
        wins: winCount ?? prev.wins,
      }));
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

    loadQuickLinks();
    loadStats();
    loadAdminFlag();
  }, []);

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sky-100/80 via-teal-50/70 to-lime-50/60 p-8 text-foreground shadow-2xl dark:border-white/10 dark:from-red-700/30 dark:via-orange-600/20 dark:to-amber-500/15 dark:text-white"
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
            KK Advisory Intranet
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Everything the team needs, in one focused workspace.
          </h1>
          <p className="text-lg text-muted-foreground dark:text-white/80">
            Fast access to people, knowledge, projects, wins, travel, polls, and bookings—
            secured with Google OAuth and powered by Supabase.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-white dark:text-slate-900">
              <Link href="/team">
                Meet the team <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border bg-transparent text-foreground hover:bg-muted dark:border-white/40 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              asChild
            >
              <Link href="/knowledge">Explore knowledge hub</Link>
            </Button>
            {isAdmin && (
              <Button
                variant="secondary"
                size="lg"
                className="border-border bg-accent/40 text-foreground hover:bg-accent/50 dark:bg-white/10 dark:text-white"
                asChild
              >
                <Link href="/admin/invite">Invite teammates</Link>
              </Button>
            )}
          </div>
        </motion.div>
        <GradientOrbs />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Team heavy-hitters"
          value={stats.team}
          accent="from-sky-300/60 via-teal-300/50 to-lime-300/60 dark:from-red-600/60 dark:to-orange-500/60"
          href="/team"
          dataTour="tour-stat-team"
        />
        <StatCard
          title="Active projects"
          value={stats.projects}
          accent="from-teal-300/60 via-sky-200/60 to-lime-200/60 dark:from-amber-500/60 dark:to-orange-500/60"
          href="/projects"
          dataTour="tour-stat-projects"
        />
        <StatCard
          title="Wins logged"
          value={stats.wins}
          accent="from-lime-300/60 via-teal-200/60 to-sky-200/60 dark:from-rose-500/60 dark:to-red-600/60"
          href="/wins"
          dataTour="tour-stat-wins"
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
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground dark:text-white/70">
                  <span>{link.url.replace(/^https?:\/\//, "")}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </motion.a>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/90 text-foreground backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white" data-tour="tour-momentum">
          <CardHeader>
            <CardTitle>Momentum</CardTitle>
            <CardDescription>Fresh activity from the workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Team directory completeness", value: 88 },
              { label: "Knowledge hub freshness", value: 74 },
              { label: "Project milestone confidence", value: 63 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">{item.value}%</span>
                </div>
                <Progress value={item.value} className="mt-2" />
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-primary/40 text-primary"
              asChild
            >
              <Link href="/knowledge">
                Go to The Brain <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  accent,
  href,
  dataTour,
}: {
  title: string;
  value: number;
  accent: string;
  href: string;
  dataTour?: string;
}) {
  return (
    <Link href={href} className="group" data-tour={dataTour}>
      <Card className="relative overflow-hidden border-border bg-card text-foreground backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white">
        <div className={`absolute inset-0 opacity-60 blur-2xl bg-gradient-to-br ${accent}`} />
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
            <Wand2 className="h-4 w-4 text-primary" /> {title}
          </CardDescription>
          <CardTitle className="text-3xl font-black">{value}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Tap to dive in</span>
          <Rocket className="h-4 w-4 text-primary transition group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  );
}

// Removed unused decorative sparkle.

function GradientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute right-10 top-10 h-28 w-28 animate-pulse rounded-full bg-sky-300/40 blur-3xl dark:bg-orange-400/40" />
      <div className="absolute -left-10 bottom-0 h-40 w-40 animate-pulse rounded-full bg-teal-200/40 blur-3xl dark:bg-red-500/30" />
    <div className="absolute left-20 top-5 h-32 w-32 animate-pulse rounded-full bg-lime-200/40 blur-3xl dark:bg-amber-400/30" />
  </div>
);
}
