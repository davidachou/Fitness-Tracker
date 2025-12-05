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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Mail, MessageCircle, CalendarClock, Linkedin } from "lucide-react";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  expertise: string[];
  photo: string;
  slack: string;
  calendly: string;
  email: string;
  linkedin: string;
};

const localFallback: TeamMember[] = [
  {
    id: "tm-kk",
    name: "Kristin Kelly",
    role: "Managing Director & Founder",
    bio: "Leads KK Advisory with strategic direction and client stewardship.",
    expertise: ["Leadership", "Strategy", "Client Advisory"],
    photo: "/team/Kristin Kelly.png",
    slack: "slack://user?team=ABC&id=KK1",
    calendly: "https://calendly.com/placeholder",
    email: "kristin.kelly@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-jl",
    name: "Justin Longua",
    role: "Managing Director, Actuary",
    bio: "Actuarial leader focused on risk modeling and pricing.",
    expertise: ["Actuarial", "Pricing", "Risk Modeling"],
    photo: "/team/Justin Longua.png",
    slack: "slack://user?team=ABC&id=JL1",
    calendly: "https://calendly.com/placeholder",
    email: "justin.longua@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-ar",
    name: "Ally Reilly",
    role: "Director",
    bio: "Directs delivery across complex engagements and clients.",
    expertise: ["Delivery", "Engagements", "Client Success"],
    photo: "/team/Ally Reilly.png",
    slack: "slack://user?team=ABC&id=AR1",
    calendly: "https://calendly.com/placeholder",
    email: "ally.reilly@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-mk",
    name: "Maddy Kelly",
    role: "Head of Revenue & Operations",
    bio: "Runs revenue ops, forecasting, and operational excellence.",
    expertise: ["RevOps", "Forecasting", "Operations"],
    photo: "/team/Maddy Kelly.png",
    slack: "slack://user?team=ABC&id=MK1",
    calendly: "https://calendly.com/placeholder",
    email: "maddy.kelly@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-dc",
    name: "David Chou",
    role: "Actuarial Consultant",
    bio: "Delivers actuarial analysis with clear, client-ready insights.",
    expertise: ["Actuarial", "Analytics", "Modeling"],
    photo: "/team/David Chou.png",
    slack: "slack://user?team=ABC&id=DC1",
    calendly: "https://calendly.com/placeholder",
    email: "david.chou@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-mm",
    name: "Molly McDermott",
    role: "Executive Assistant",
    bio: "Keeps leadership organized and engagements moving.",
    expertise: ["Ops", "Scheduling", "Coordination"],
    photo: "/team/Molly McDermott.png",
    slack: "slack://user?team=ABC&id=MM1",
    calendly: "https://calendly.com/placeholder",
    email: "molly.mcdermott@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-bh",
    name: "Bruce Henderson",
    role: "Senior Advisor",
    bio: "Advises on strategy and executive engagement.",
    expertise: ["Strategy", "Executive Advisory"],
    photo: "/team/Bruce Henderson.png",
    slack: "slack://user?team=ABC&id=BH1",
    calendly: "https://calendly.com/placeholder",
    email: "bruce.henderson@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-ke",
    name: "Keith Epperson",
    role: "Senior Advisor, Actuary",
    bio: "Guides actuarial frameworks and risk governance.",
    expertise: ["Actuarial", "Risk", "Governance"],
    photo: "/team/Keith Epperson.png",
    slack: "slack://user?team=ABC&id=KE1",
    calendly: "https://calendly.com/placeholder",
    email: "keith.epperson@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-je",
    name: "Jackie Edison",
    role: "Consultant",
    bio: "Delivers project workstreams with crisp execution.",
    expertise: ["Delivery", "Analysis", "Client Service"],
    photo: "/team/Jackie Edison.png",
    slack: "slack://user?team=ABC&id=JE1",
    calendly: "https://calendly.com/placeholder",
    email: "jackie.edison@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-co",
    name: "Chris Orr",
    role: "Consultant",
    bio: "Supports consulting engagements with data-driven insights.",
    expertise: ["Data", "Consulting", "Insights"],
    photo: "/team/Chris Orr.png",
    slack: "slack://user?team=ABC&id=CO1",
    calendly: "https://calendly.com/placeholder",
    email: "chris.orr@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-ec",
    name: "Erica Cook-Shugart",
    role: "Actuary",
    bio: "Actuarial expertise across pricing and reserving.",
    expertise: ["Actuarial", "Pricing", "Reserving"],
    photo: "/team/Erica Cook-Shugart.png",
    slack: "slack://user?team=ABC&id=EC1",
    calendly: "https://calendly.com/placeholder",
    email: "erica.cookshugart@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-cg",
    name: "Christine Gilroy",
    role: "MD, Consultant",
    bio: "Consulting MD shaping client outcomes and delivery.",
    expertise: ["Leadership", "Consulting", "Delivery"],
    photo: "/team/Christine Gilroy.png",
    slack: "slack://user?team=ABC&id=CG1",
    calendly: "https://calendly.com/placeholder",
    email: "christine.gilroy@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
  {
    id: "tm-lh",
    name: "Lauren Henfling",
    role: "Consultant",
    bio: "Consultant delivering client-ready research and analysis.",
    expertise: ["Research", "Analysis", "Client Support"],
    photo: "/team/Lauren Henfling.png",
    slack: "slack://user?team=ABC&id=LH1",
    calendly: "https://calendly.com/placeholder",
    email: "lauren.henfling@example.com",
    linkedin: "https://linkedin.com/in/placeholder",
  },
];

export default function TeamDirectoryPage() {
  const [members, setMembers] = useState<TeamMember[]>(localFallback);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    const loadFromSupabase = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("team_members").select("*");
      if (data && data.length > 0) {
        setMembers(
          data.map((tm) => ({
            id: tm.id,
            name: tm.name,
            role: tm.role,
            bio: tm.bio,
            expertise: tm.expertise || [],
            photo: tm.photo || `/team/${tm.name}.png`,
            slack: tm.slack,
            calendly: tm.calendly,
            email: tm.email,
            linkedin: tm.linkedin,
          })),
        );
      }
    };
    loadFromSupabase();
  }, []);

  const tags = useMemo(() => {
    const unique = new Set<string>();
    members.forEach((m) => m.expertise.forEach((tag) => unique.add(tag)));
    return Array.from(unique);
  }, [members]);

  const fuse = useMemo(
    () =>
      new Fuse(members, {
        keys: ["name", "role", "bio", "expertise"],
        threshold: 0.35,
      }),
    [members],
  );

  const filtered = useMemo(() => {
    const results = query ? fuse.search(query).map((r) => r.item) : members;
    if (!activeTag) return results;
    return results.filter((m) => m.expertise.includes(activeTag));
  }, [query, fuse, members, activeTag]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Who knows about…</p>
          <h2 className="text-3xl font-black text-foreground dark:text-white">Smart Team Directory</h2>
          <p className="text-muted-foreground">
            Search by expertise, role, bio, or name. Click tags to filter instantly.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-4 backdrop-blur dark:border-red-500/20 dark:bg-white/5">
        <Input
          placeholder="Who knows about pricing, AI, or onboarding?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 border-border bg-background text-base text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
        />
        <ScrollArea className="w-full">
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant={activeTag === null ? "default" : "outline"}
              onClick={() => setActiveTag(null)}
              className="rounded-full"
            >
              All expertise
            </Button>
            {tags.map((tag) => (
              <Button
                key={tag}
                size="sm"
                variant={tag === activeTag ? "default" : "outline"}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className="rounded-full"
              >
                {tag}
              </Button>
            ))}
          </div>
        </ScrollArea>
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
                        <AvatarFallback className="text-4xl font-bold">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
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
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    {member.expertise.map((tag) => (
                      <Button
                        key={tag}
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTag(tag)}
                        className="rounded-full"
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-sm">
                    <ActionLink href={member.slack} label="Slack" icon={<MessageCircle className="h-4 w-4" />} />
                    <ActionLink href={member.calendly} label="Calendly" icon={<CalendarClock className="h-4 w-4" />} />
                    <ActionLink href={`mailto:${member.email}`} label="Email" icon={<Mail className="h-4 w-4" />} />
                    <ActionLink href={member.linkedin} label="LinkedIn" icon={<Linkedin className="h-4 w-4" />} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
          <p className="text-muted-foreground">No matches yet. Try another skill or tag.</p>
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
  return (
    <Link
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80 transition hover:-translate-y-0.5 hover:border-primary/50 hover:text-white"
      onClick={() => toast.success(`${label} launched`)}
    >
      {icon}
      {label}
    </Link>
  );
}

