"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  KanbanSquare,
  Trophy,
  CalendarClock,
  LinkIcon,
  MessageSquare,
  CalendarDays,
  BarChart4,
  Menu,
  X,
  LogOut,
  Sparkles,
  UserCircle2,
  Timer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { toast } from "sonner";
import { RealtimeTimerProvider } from "@/components/tracker/RealtimeTimerProvider";
import { TimerBadge } from "@/components/tracker/TimerBadge";

type AppShellProps = {
  user: {
    id: string;
    email?: string | null;
  };
  children: React.ReactNode;
};

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type NavStatus = "in-progress" | "placeholder";

const navItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; status?: NavStatus }[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, status: "placeholder" },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/knowledge", label: "The Brain", icon: BookOpen, status: "placeholder" },
  { href: "/projects", label: "Projects", icon: KanbanSquare, status: "placeholder" },
  { href: "/wins", label: "Wins & Blog", icon: Trophy, status: "placeholder" },
  { href: "/calendar", label: "Calendar", icon: CalendarClock },
  { href: "/quick-links", label: "Quick Links", icon: LinkIcon, status: "placeholder" },
  { href: "/feedback", label: "Feedback", icon: MessageSquare, status: "placeholder" },
  { href: "/booking", label: "Bookings", icon: CalendarDays, status: "placeholder" },
  { href: "/polls", label: "Polls", icon: BarChart4, status: "placeholder" },
  { href: "/tracker", label: "Time Tracker", icon: Timer },
];

type TourStep = {
  id: string;
  title: string;
  body: string;
  selector: string;
  href: string;
  advanceKey: string;
};

const TOUR_STORAGE_KEY = "app-tour-completed";

const navTourSteps: TourStep[] = [
  {
    id: "tour-theme",
    title: "Light / Dark",
    body: "Switch themes anytime. Click to toggle and move to the next stop.",
    selector: "[data-tour-nav='theme']",
    href: "#theme",
    advanceKey: "theme",
  },
  {
    id: "tour-nav-home",
    title: "Home",
    body: "Snapshot of the workspace and quick actions.",
    selector: "[data-tour-nav='dashboard']",
    href: "/dashboard",
    advanceKey: "dashboard",
  },
  {
    id: "tour-nav-profile",
    title: "Profile",
    body: "Update your details so teammates know how to reach you.",
    selector: "[data-tour-nav='profile']",
    href: "/profile",
    advanceKey: "profile",
  },
  {
    id: "tour-nav-team",
    title: "Team",
    body: "Browse the team directory and find the right expertise.",
    selector: "[data-tour-nav='team']",
    href: "/team",
    advanceKey: "team",
  },
  {
    id: "tour-nav-knowledge",
    title: "Knowledge Hub",
    body: "Search institutional knowledge and docs.",
    selector: "[data-tour-nav='knowledge']",
    href: "/knowledge",
    advanceKey: "knowledge",
  },
  {
    id: "tour-nav-projects",
    title: "Projects",
    body: "Track projects, statuses, and milestones.",
    selector: "[data-tour-nav='projects']",
    href: "/projects",
    advanceKey: "projects",
  },
  {
    id: "tour-nav-wins",
    title: "Wins & Blog",
    body: "Share and celebrate wins and announcements.",
    selector: "[data-tour-nav='wins']",
    href: "/wins",
    advanceKey: "wins",
  },
  {
    id: "tour-nav-calendar",
    title: "Calendar",
    body: "View company calendar and events.",
    selector: "[data-tour-nav='calendar']",
    href: "/calendar",
    advanceKey: "calendar",
  },
  {
    id: "tour-nav-quick-links",
    title: "Quick Links",
    body: "Jump to frequent destinations fast.",
    selector: "[data-tour-nav='quick-links']",
    href: "/quick-links",
    advanceKey: "quick-links",
  },
  {
    id: "tour-nav-feedback",
    title: "Feedback",
    body: "Send feedback and ideas to the team.",
    selector: "[data-tour-nav='feedback']",
    href: "/feedback",
    advanceKey: "feedback",
  },
  {
    id: "tour-nav-booking",
    title: "Bookings",
    body: "Reserve rooms or equipment.",
    selector: "[data-tour-nav='booking']",
    href: "/booking",
    advanceKey: "booking",
  },
  {
    id: "tour-nav-polls",
    title: "Polls",
    body: "Vote on quick decisions and surveys.",
    selector: "[data-tour-nav='polls']",
    href: "/polls",
    advanceKey: "polls",
  },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  const activeTourStep = isTourActive ? navTourSteps[tourIndex] : null;

  const startTour = () => {
    setTourIndex(0);
    setIsTourActive(true);
  };

  const finishTour = () => {
    setIsTourActive(false);
    setTourIndex(0);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } catch {
      // ignore storage errors
    }
  };

  const advanceTour = (key: string) => {
    if (!isTourActive) return;
    setTourIndex((i) => {
      const currentStep = navTourSteps[i];
      if (!currentStep || currentStep.advanceKey !== key) return i;
      const next = i + 1;
      if (next >= navTourSteps.length) {
        finishTour();
        return i;
      }
      return next;
    });
  };

  const handleNavClick = (href: string) => {
    setIsMobileNavOpen(false);
    const tourKey = href.replace("/", "") || "home";
    advanceTour(tourKey);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, role")
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }
        setProfile(data);
      } catch (error) {
        console.error("Failed to load profile", error);
      }
    };

    loadProfile();
  }, [user.id]);

  useEffect(() => {
    const endTour = () => {
      setIsTourActive(false);
      setTourIndex(0);
    };

    window.addEventListener("app-tour:start", startTour);
    window.addEventListener("app-tour:end", endTour);

    return () => {
      window.removeEventListener("app-tour:start", startTour);
      window.removeEventListener("app-tour:end", endTour);
    };
  }, []);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY) === "true";
      if (!completed) {
        const id = window.setTimeout(() => {
          startTour();
        }, 400);
        return () => window.clearTimeout(id);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const initials = useMemo(() => {
    const name = profile?.full_name || user.email || "User";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.full_name, user.email]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/auth/login");
  };

  const renderNav = () => (
    <nav className="space-y-2">
      {navItems.map(({ href, label, icon: Icon, status }) => {
        const active = pathname === href;
        const tourSlug = href.replace("/", "") || "home";
        return (
          <Link
            key={href}
            href={href}
            onClick={() => handleNavClick(href)}
            data-tour-nav={tourSlug}
          >
            <motion.div
              whileHover={{ x: 6, scale: 1.01 }}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-sky-200/70 via-teal-200/70 to-lime-200/70 text-foreground border border-primary/30 shadow-lg shadow-primary/10 dark:from-red-600/25 dark:via-orange-500/25 dark:to-amber-500/25 dark:border-red-500/40 dark:shadow-red-600/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex items-center gap-2">
                {label}
                {status && (
                  <span
                    className={`rounded-full px-2 py-[2px] text-[10px] font-semibold leading-tight ${
                      status === "in-progress"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-200"
                        : "bg-slate-500/15 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {status === "in-progress" ? "In progress" : "Placeholder"}
                  </span>
                )}
              </span>
              {active && (
                <motion.span
                  layoutId="activeNav"
                  className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-sky-200/70 via-teal-200/60 to-lime-200/60 dark:from-red-700/20 dark:via-orange-600/20 dark:to-amber-500/20"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <RealtimeTimerProvider userId={user.id}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,hsla(var(--primary),0.16),transparent_32%),radial-gradient(circle_at_80%_0%,hsla(var(--accent),0.18),transparent_28%),radial-gradient(circle_at_60%_80%,hsla(var(--primary),0.14),transparent_35%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.14),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.14),transparent_28%),radial-gradient(circle_at_60%_80%,rgba(59,7,11,0.35),transparent_35%)]" />
        <div className="relative z-10 mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-6 rounded-3xl border border-white/5 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-3">
                <Avatar className="border border-white/20 shadow-md">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold leading-tight text-foreground">
                    {profile?.full_name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.role || "KK Advisory"}
                  </p>
                </div>
              </div>
              <Separator className="my-4 border-white/10" />
              {renderNav()}
              <Button
                variant="ghost"
                className="mt-4 w-full justify-start gap-2 text-foreground hover:bg-primary/10 hover:text-primary dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-100"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </aside>

          <div className="flex-1 space-y-6">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsMobileNavOpen((prev) => !prev)}
                >
                  {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary/70">
                    KK Advisory Intranet
                  </p>
                  <h1 className="text-2xl font-bold text-foreground dark:text-white drop-shadow-sm">
                    Team Workspace
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TimerBadge />
                <div className="hidden sm:block text-sm text-muted-foreground">
                  Signed in as{" "}
                  <span className="font-semibold text-foreground">
                    {profile?.full_name || user.email}
                  </span>
                </div>
                <div
                  data-tour-nav="theme"
                  onClick={() => advanceTour("theme")}
                  className="flex items-center"
                >
                  <ThemeSwitcher />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-primary/30 bg-gradient-to-r from-sky-200/80 via-teal-200/70 to-lime-200/80 text-foreground shadow-md shadow-primary/20 transition hover:shadow-lg hover:shadow-primary/30 dark:from-red-500/40 dark:via-orange-400/40 dark:to-amber-400/40 dark:text-white dark:hover:text-white dark:hover:shadow-red-500/30"
                  onClick={() => window.dispatchEvent(new CustomEvent("app-tour:start"))}
                >
                  <Sparkles className="h-4 w-4" />
                  Start tour
                </Button>
              </div>
            </header>

          <AnimatePresence>
            {isMobileNavOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="lg:hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur"
              >
                {renderNav()}
                <Button
                  variant="ghost"
                  className="mt-4 w-full justify-start gap-2 text-red-300 hover:bg-red-500/10 hover:text-red-100"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="relative rounded-3xl border border-white/5 bg-white/5 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-white/5 via-white/0 to-white/5" />
            {children}
          </main>
        </div>
      </div>
        {activeTourStep && (
          <TourOverlay
            step={activeTourStep}
            stepIndex={tourIndex}
            totalSteps={navTourSteps.length}
            onClose={finishTour}
          />
        )}
      </div>
    </RealtimeTimerProvider>
  );
}

function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  onClose,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onClose: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [canPortal, setCanPortal] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useLayoutEffect(() => {
    const update = () => {
      const el = step ? (document.querySelector(step.selector) as HTMLElement | null) : null;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    setCanPortal(true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  useLayoutEffect(() => {
    if (!rect) return;
    const padding = 16;
    const overlayHeight = popoverRef.current?.offsetHeight ?? 0;
    const overlayWidth = popoverRef.current?.offsetWidth ?? 0;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    let nextTop = rect.bottom + 12;
    let nextLeft = rect.left;

    if (overlayHeight && nextTop + overlayHeight > viewportH - padding) {
      nextTop = Math.max(padding, rect.top - overlayHeight - 12);
    }

    if (overlayWidth) {
      nextLeft = Math.min(Math.max(padding, nextLeft), Math.max(padding, viewportW - overlayWidth - padding));
    }

    setPopoverPos({ top: nextTop, left: nextLeft });
  }, [rect, step]);

  if (!step || !rect) return null;

  const holePadding = 12;

  const overlay = (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div
        className="absolute pointer-events-none rounded-xl border-2 border-primary/60 bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
        style={{
          top: rect.top - holePadding,
          left: rect.left - holePadding,
          width: rect.width + holePadding * 2,
          height: rect.height + holePadding * 2,
        }}
      />
      <div
        className="pointer-events-auto absolute max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl dark:border-white/10 dark:bg-neutral-900"
        ref={popoverRef}
        style={popoverPos}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              Step {stepIndex + 1} of {totalSteps}
            </p>
            <h3 className="text-lg font-semibold">{step.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="End tour"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Click the highlighted tab to continue.</span>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-muted"
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );

  return canPortal ? createPortal(overlay, document.body) : overlay;
}

