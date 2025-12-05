"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { sampleQuickLinks } from "@/lib/sample-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Zap, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type QuickLink = (typeof sampleQuickLinks)[number];

export default function QuickLinksPage() {
  const [links, setLinks] = useState<QuickLink[]>(sampleQuickLinks);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.from("quick_links").select("*");
      if (data && data.length > 0) setLinks(data as QuickLink[]);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Launchpad</p>
        <h2 className="text-3xl font-black">Quick Links</h2>
        <p className="text-muted-foreground">
          One-click buttons to the tools you hit daily. Edit in Supabase anytime.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {links.map((link, idx) => (
          <motion.a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/5"
            onClick={() => toast.success(`Opening ${link.label}`)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-200/30 via-teal-200/25 to-lime-200/25 opacity-0 transition group-hover:opacity-100 dark:from-red-600/10 dark:via-orange-500/10 dark:to-amber-500/10" />
            <Card className="h-full border-0 bg-transparent">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg text-foreground dark:text-white">{link.label}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary dark:bg-white/10 dark:text-white">
                  <Zap className="h-4 w-4" />
                </Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="truncate">{link.url.replace(/^https?:\/\//, "")}</span>
                <ArrowUpRight className="h-4 w-4" />
              </CardContent>
            </Card>
          </motion.a>
        ))}
      </div>

      <Card className="border-border bg-card text-foreground backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Editing Quick Links
          </CardTitle>
          <CardDescription>Manage rows in Supabase table `quick_links`.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge className="bg-emerald-500/15 text-foreground dark:text-emerald-100">Add / remove in DB</Badge>
          <Badge className="bg-amber-500/15 text-foreground dark:text-amber-100">Icons: Folder, Receipt, Clock, Shield</Badge>
          <Badge className="bg-sky-500/15 text-foreground dark:text-indigo-100">Hover: bounce + glow</Badge>
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/dashboard">
              <Sparkles className="h-4 w-4" /> Back to dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

