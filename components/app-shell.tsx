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
  Megaphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AdminUIToggle } from "@/components/admin-ui-toggle";
import { toast } from "sonner";
import { RealtimeTimerProvider } from "@/components/tracker/RealtimeTimerProvider";
import { Card, CardContent } from "@/components/ui/card";
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
  is_admin?: boolean;
};

type NavStatus = "in-progress" | "placeholder";
type Announcement = { id: string; message: string; created_at: string; user_id?: string | null };

const navItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; status?: NavStatus }[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/knowledge", label: "The Brain", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: KanbanSquare },
  { href: "/wins", label: "Wins & Blog", icon: Trophy },
  { href: "/calendar", label: "Calendar", icon: CalendarClock },
  { href: "/quick-links", label: "Quick Links", icon: LinkIcon },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/booking", label: "Bookings", icon: CalendarDays, status: "placeholder" },
  { href: "/polls", label: "Polls", icon: BarChart4 },
  { href: "/tracker", label: "Time Tracker", icon: Timer },
];

type TourStep = {
  id: string;
  title: string;
  body: string;
  selector: string;
  href: string;
};

const TOUR_STORAGE_KEY = "app-tour-completed";

const tourSteps: TourStep[] = [
  {
    id: "tour-announcements",
    title: "Announcements",
    body: "Ticker for org updates. Use the arrows to skim updates; it’s visible everywhere.",
    selector: "[data-tour='announcement-bar']",
    href: "/dashboard",
  },
  {
    id: "tour-theme",
    title: "Light / Dark",
    body: "Toggle themes anytime; colors stay consistent across the app.",
    selector: "[data-tour-nav='theme']",
    href: "/dashboard",
  },
  {
    id: "tour-home",
    title: "Home",
    body: "Dashboard with quick actions, stats, quick links, and the latest poll.",
    selector: "[data-tour-nav='dashboard']",
    href: "/dashboard",
  },
  {
    id: "tour-profile",
    title: "Your profile",
    body: "Update photo, bio, and expertise—these power the Team directory.",
    selector: "[data-tour-nav='profile']",
    href: "/profile",
  },
  {
    id: "tour-team",
    title: "Team directory",
    body: "Search by name or expertise and open profiles for contact links.",
    selector: "[data-tour-nav='team']",
    href: "/team",
  },
  {
    id: "tour-knowledge",
    title: "Knowledge hub",
    body: "Search tagged assets; admins can add or edit important links.",
    selector: "[data-tour-nav='knowledge']",
    href: "/knowledge",
  },
  {
    id: "tour-projects",
    title: "Projects",
    body: "See which teammates are staffed for each client based on time logs.",
    selector: "[data-tour-nav='projects']",
    href: "/projects",
  },
  {
    id: "tour-wins",
    title: "Wins & blog",
    body: "Publish wins or embed LinkedIn posts; admins can edit anything.",
    selector: "[data-tour-nav='wins']",
    href: "/wins",
  },
  {
    id: "tour-calendar",
    title: "Calendar",
    body: "Shared Google Calendar for OOO, travel, and key dates.",
    selector: "[data-tour-nav='calendar']",
    href: "/calendar",
  },
  {
    id: "tour-quick-links",
    title: "Quick Links",
    body: "Launchpad of daily tools; admins can add or edit icons and URLs.",
    selector: "[data-tour-nav='quick-links']",
    href: "/quick-links",
  },
  {
    id: "tour-feedback",
    title: "Feedback inbox",
    body: "Client vs employee channels; submit, edit, or delete your own (admins can edit all).",
    selector: "[data-tour-nav='feedback']",
    href: "/feedback",
  },
  {
    id: "tour-booking",
    title: "Bookings (placeholder)",
    body: "This tab is a placeholder (we could swap in anything—even lunch menus). Share what you want built here.",
    selector: "[data-tour-nav='booking']",
    href: "/booking",
  },
  {
    id: "tour-polls",
    title: "Polls",
    body: "Create and vote; results show live on the dashboard.",
    selector: "[data-tour-nav='polls']",
    href: "/polls",
  },
  {
    id: "tour-tracker",
    title: "Time tracker",
    body: "Start timers, log entries, manage tasks, and run reports by client.",
    selector: "[data-tour-nav='tracker']",
    href: "/tracker",
  },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  const activeTourStep = isTourActive ? tourSteps[tourIndex] : null;

  const startTour = () => {
    setTourIndex(0);
    setIsTourActive(true);
    setIsMobileNavOpen(false);
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

  const nextTourStep = () => {
    setTourIndex((i) => {
      const next = i + 1;
      if (next >= tourSteps.length) {
        finishTour();
        return i;
      }
      return next;
    });
  };

  const prevTourStep = () => {
    setTourIndex((i) => Math.max(0, i - 1));
  };

  const handleNavClick = () => {
    setIsMobileNavOpen(false);
  };

  useEffect(() => {
    if (!isTourActive) return;
    const step = tourSteps[tourIndex];
    if (step?.href && step.href !== pathname) {
      router.push(step.href);
    }
  }, [isTourActive, tourIndex, pathname, router]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, role, is_admin")
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
    const loadAnnouncements = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (data) setAnnouncements(data as Announcement[]);
    };
    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (announcements.length === 0) return;
    const id = setInterval(() => {
      setAnnouncementIndex((idx) => (idx + 1) % announcements.length);
    }, 18000);
    return () => clearInterval(id);
  }, [announcements]);

  const nextAnnouncement = () => {
    if (announcements.length === 0) return;
    setAnnouncementIndex((idx) => (idx + 1) % announcements.length);
  };

  const prevAnnouncement = () => {
    if (announcements.length === 0) return;
    setAnnouncementIndex((idx) => (idx - 1 + announcements.length) % announcements.length);
  };

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

  // Tour is now fully optional; no auto-start for first-time visitors.

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
            onClick={handleNavClick}
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

  const BANNER_HEIGHT = 30;
  const CONTENT_OFFSET = 40; // push content slightly below the banner

  return (
    <RealtimeTimerProvider userId={user.id}>
      <div className="min-h-screen bg-background text-foreground" style={{ paddingTop: BANNER_HEIGHT + CONTENT_OFFSET }}>
        <div className="fixed inset-x-0 top-0 z-50" style={{ height: BANNER_HEIGHT }}>
          <Card
            className="h-full rounded-none border-0 bg-white text-primary shadow-md dark:bg-black dark:text-primary"
            data-tour="announcement-bar"
          >
            <CardContent className="flex h-full items-center gap-2 overflow-hidden px-3 py-0">
              <Megaphone className="h-4 w-4 shrink-0 text-primary" />
              <div className="relative flex flex-1 items-center overflow-hidden">
                <motion.div
                  key={announcements[announcementIndex]?.id ?? "fallback"}
                  initial={{ x: "100%" }}
                  animate={{ x: ["100%", "-100%"] }}
                  transition={{ duration: 30, ease: "linear", repeat: Infinity, repeatType: "loop" }}
                  className="inline-block whitespace-nowrap text-xs sm:text-sm leading-[1.1]"
                  style={{ minWidth: "100%", willChange: "transform" }}
                >
                  {announcements[announcementIndex]?.message ?? "No announcements yet."}
                </motion.div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={prevAnnouncement} disabled={announcements.length === 0}>
                  ‹
                </Button>
                <Button variant="ghost" size="icon" onClick={nextAnnouncement} disabled={announcements.length === 0}>
                  ›
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,hsla(var(--primary),0.16),transparent_32%),radial-gradient(circle_at_80%_0%,hsla(var(--accent),0.18),transparent_28%),radial-gradient(circle_at_60%_80%,hsla(var(--primary),0.14),transparent_35%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.14),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.14),transparent_28%),radial-gradient(circle_at_60%_80%,rgba(59,7,11,0.35),transparent_35%)]" />
        <div className="relative z-10 mx-auto mt-6 flex max-w-7xl gap-6 px-4 pb-6 lg:mt-8 lg:pl-[320px] lg:pr-8 lg:pb-8">
          <aside className="hidden lg:block">
            <div
              className="fixed w-64 rounded-3xl border border-white/5 bg-white/5 p-4 shadow-2xl backdrop-blur-xl"
              style={{
                top: BANNER_HEIGHT + CONTENT_OFFSET,
                left: "calc((100vw - 80rem) / 2 + 2rem)",
              }}
            >
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
                  className="flex items-center gap-1"
                >
                  <AdminUIToggle isAdmin={Boolean(profile?.is_admin)} />
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
            <div className="space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
        {activeTourStep && (
          <TourOverlay
            step={activeTourStep}
            stepIndex={tourIndex}
            totalSteps={tourSteps.length}
            onClose={finishTour}
            onNext={nextTourStep}
            onPrev={prevTourStep}
            isLast={tourIndex === tourSteps.length - 1}
            hasPrev={tourIndex > 0}
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
  onNext,
  onPrev,
  isLast,
  hasPrev,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
  hasPrev: boolean;
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
    if (!step) return;
    const padding = 16;
    const overlayHeight = popoverRef.current?.offsetHeight ?? 0;
    const overlayWidth = popoverRef.current?.offsetWidth ?? 0;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    const hasTarget = rect && rect.width > 0 && rect.height > 0;

    let nextTop = hasTarget ? rect.bottom + 12 : viewportH / 2 - (overlayHeight || 0) / 2;
    let nextLeft = hasTarget ? rect.left : viewportW / 2 - (overlayWidth || 0) / 2;

    if (overlayHeight && nextTop + overlayHeight > viewportH - padding) {
      nextTop = Math.max(padding, (hasTarget ? rect.top : nextTop) - overlayHeight - 12);
    }

    if (overlayWidth) {
      nextLeft = Math.min(Math.max(padding, nextLeft), Math.max(padding, viewportW - overlayWidth - padding));
    }

    setPopoverPos({ top: nextTop, left: nextLeft });
  }, [rect, step]);

  if (!step) return null;

  const holePadding = 12;
  const hasTarget = rect && rect.width > 0 && rect.height > 0;

  const overlay = (
    <div className="pointer-events-none fixed inset-0 z-40">
      {hasTarget && rect && (
        <div
          className="absolute pointer-events-none rounded-xl border-2 border-primary/60 bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
          style={{
            top: rect.top - holePadding,
            left: rect.left - holePadding,
            width: rect.width + holePadding * 2,
            height: rect.height + holePadding * 2,
          }}
        />
      )}
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
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>{hasTarget ? "Highlighted area" : "Step context"} — use Next to continue.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-muted disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={isLast ? onClose : onNext}
              className="rounded-md bg-primary px-3 py-1 text-primary-foreground hover:bg-primary/90"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return canPortal ? createPortal(overlay, document.body) : overlay;
}

