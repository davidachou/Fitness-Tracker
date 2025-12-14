"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getAvatarUrl } from "@/lib/utils";
import { Mail, User } from "lucide-react";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
  calendly: string;
  email: string;
};

const localFallback: TeamMember[] = [];


export default function TeamDirectoryPage() {
  const [members, setMembers] = useState<TeamMember[]>(localFallback);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadFromSupabase = async () => {
      const supabase = createClient();
      // Query profiles directly - show admins and staff only (no clients)
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, avatar_url, bio, is_admin")
        .order("full_name");

      const dbMembers =
        data?.filter((profile) => {
          // Show admins OR profiles with non-client roles
          return profile.is_admin || (profile.role && !profile.role.toLowerCase().includes('client'));
        })
        .map((profile) => {
          const name = profile.full_name?.trim() || "Team Member";

          return {
            id: profile.id,
            name,
            role: profile.is_admin ? "Administrator" : (profile.role || "Team Member"),
            bio: profile.bio || "",
            photo: getAvatarUrl(name, profile.avatar_url),
            calendly: "",
            email: profile.email || "",
          } satisfies TeamMember;
        }) ?? [];
      setMembers(dbMembers);
    };
    loadFromSupabase();
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(members, {
        keys: ["name", "role", "bio"],
        threshold: 0.35,
      }),
    [members],
  );

  const filtered = useMemo(() => {
    return query ? fuse.search(query).map((r) => r.item) : members;
  }, [query, fuse, members]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Meet the team</p>
          <h2 className="text-3xl font-black text-foreground dark:text-white">Our Trainers & Staff</h2>
          <p className="text-muted-foreground">
            Connect with our fitness trainers and support staff.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-4 backdrop-blur dark:border-red-500/20 dark:bg-white/5">
        <Input
          placeholder="Search by name, role, or bio..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 border-border bg-background text-base text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
        />
      </div>

      <AnimatePresence mode="popLayout">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((member, idx) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card className="h-full overflow-visible border-border bg-card shadow-xl backdrop-blur transition hover:-translate-y-1 hover:shadow-primary/20 dark:border-white/10 dark:bg-white/5">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="overflow-hidden rounded-2xl shadow-lg">
                      <Avatar className="h-[250px] w-[250px] rounded-none">
                        <AvatarImage src={member.photo} alt={member.name} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          <User className="h-16 w-16" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="text-center space-y-1">
                      <CardTitle className="text-xl">{member.name}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {member.role}
                      </CardDescription>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center sm:text-left">{member.bio}</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-sm">
                    <ActionLink href={`mailto:${member.email}`} label="Email" icon={<Mail className="h-4 w-4" />} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
          <p className="text-muted-foreground">No team members found matching your search.</p>
        </div>
      )}
    </div>
  );
}

function ActionLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const isExternal = href.startsWith("http");

  return (
    <Link
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-foreground transition hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/10 dark:bg-white/5 dark:text-white/90 dark:hover:text-white"
      onClick={() => toast.success(`${label} launched`)}
    >
      {icon}
      {label}
    </Link>
  );
}

