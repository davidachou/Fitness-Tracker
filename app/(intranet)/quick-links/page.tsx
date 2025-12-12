"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { sampleQuickLinks } from "@/lib/sample-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  Zap,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Folder,
  Receipt,
  Clock,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type QuickLink = (typeof sampleQuickLinks)[number];

export default function QuickLinksPage() {
  const [links, setLinks] = useState<QuickLink[]>(sampleQuickLinks);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<QuickLink | null>(null);
  const [form, setForm] = useState<Partial<QuickLink>>({ icon: "Folder" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { adminUIMode } = useAdminUIMode();
  const iconOptions = useMemo(() => ["Folder", "Receipt", "Clock", "Shield", "Link", "Zap"], []);
  const iconMap = useMemo(
    () => ({
      Folder,
      Receipt,
      Clock,
      Shield,
      Link: Link2,
      Zap,
    }),
    [],
  );

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      try {
        const [{ data: linksData, error: linksError }, { data: userData }] = await Promise.all([
          supabase.from("quick_links").select("*"),
          supabase.auth.getUser(),
        ]);

        if (!linksError && linksData && linksData.length > 0) setLinks(linksData as QuickLink[]);
        if (userData?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", userData.user.id)
            .single();
          setIsAdmin(Boolean(profile?.is_admin));
        }
      } catch (err) {
        console.warn("quick_links fetch skipped (likely table missing)", err);
      } finally {
        // no-op
      }
    };
    load();
  }, []);

  const resetForm = () => setForm({ icon: "Folder" });

  const upsertLink = async () => {
    if (!form.label || !form.url) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      id: editing?.id || undefined,
      label: form.label,
      description: form.description ?? "",
      icon: form.icon ?? "Folder",
      url: form.url,
    };
    const { data, error } = await supabase
      .from("quick_links")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    setSaving(false);
    if (error) return;
    setLinks((prev) => {
      const without = prev.filter((l) => l.id !== data.id);
      return [...without, data as QuickLink];
    });
    setEditing(null);
    resetForm();
  };

  const removeLink = async (id: string) => {
    setDeleting(id);
    const supabase = createClient();
    const { error } = await supabase.from("quick_links").delete().eq("id", id);
    setDeleting(null);
    if (error) return;
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Launchpad</p>
        <h2 className="text-3xl font-black">Quick Links</h2>
        <p className="text-muted-foreground">
          One-click buttons to the tools you hit daily. Admins can edit here; everyone can use them.
        </p>
        {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setEditing({ id: "", label: "", description: "", icon: "Folder", url: "" })}
            >
              <Plus className="h-4 w-4" />
              Add link
            </Button>
            <span className="text-xs text-muted-foreground">Label, description, icon, URL</span>
          </div>
        )}
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
                <Badge variant="secondary" className="bg-muted/50 text-primary">
                  {(() => {
                    const Icon = iconMap[link.icon as keyof typeof iconMap] ?? Zap;
                    return <Icon className="h-4 w-4" />;
                  })()}
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

      {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
      <Card className="border-border bg-card text-foreground backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Manage Quick Links
          </CardTitle>
            <CardDescription>Admins only: add, edit, or delete links below.</CardDescription>
        </CardHeader>
          <CardContent className="space-y-3">
            {links.length === 0 && <p className="text-sm text-muted-foreground">No links yet.</p>}
            {links.map((link) => (
              <div key={link.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <p className="font-semibold">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.url}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(link);
                      setForm(link);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeLink(link.id)} disabled={deleting === link.id}>
                    <Trash2 className="h-4 w-4" />
          </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (!open ? (setEditing(null), resetForm()) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit link" : "Add link"}</DialogTitle>
            <DialogDescription>Label, description, icon, and URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={form.label ?? ""} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Icon</Label>
              <Select value={form.icon ?? "Folder"} onValueChange={(val) => setForm((p) => ({ ...p, icon: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose icon" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>URL</Label>
              <Input value={form.url ?? ""} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Changes apply immediately for everyone.</div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  resetForm();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={upsertLink} disabled={saving || !form.label || !form.url}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

