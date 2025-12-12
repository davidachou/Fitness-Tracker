"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sampleKnowledgeAssets } from "@/lib/sample-data";
import { BookMarked, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";

type Asset = ((typeof sampleKnowledgeAssets)[number]) & { user_id?: string | null };

export default function KnowledgeHubPage() {
  const [assets, setAssets] = useState<Asset[]>(sampleKnowledgeAssets);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", tags: "", link: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { adminUIMode } = useAdminUIMode();

  useEffect(() => {
    const supabase = createClient();
    const fetchAssets = async () => {
      const { data } = await supabase.from("knowledge_assets").select("*").order("last_updated", { ascending: false });
      if (data && data.length > 0) setAssets(data as Asset[]);
    };
    const fetchProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        setUserId(userData.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, full_name")
          .eq("id", userData.user.id)
          .single();
        setIsAdmin(Boolean(profile?.is_admin));
        setUserName(profile?.full_name ?? null);
      }
    };
    fetchAssets();
    fetchProfile();
  }, []);

  const tags = useMemo(() => {
    const unique = new Set<string>();
    assets.forEach((asset) => asset.tags.forEach((t) => unique.add(t)));
    return Array.from(unique);
  }, [assets]);

  const filtered = useMemo(() => {
    let res = assets;
    if (query) {
      const q = query.toLowerCase();
      res = res.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.owner.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (activeTag) {
      res = res.filter((a) => a.tags.includes(activeTag));
    }
    return res;
  }, [assets, query, activeTag]);

  const resetForm = () => {
    setForm({ title: "", description: "", tags: "", link: "" });
    setEditingId(null);
    setIsSaving(false);
  };

  const canEdit = () => shouldShowAdminFeatures(isAdmin, adminUIMode);

  const handleSubmit = async () => {
    const supabase = createClient();
    if (!form.title.trim() || !form.description.trim() || !form.link.trim()) {
      return toast.error("Title, description, and URL are required");
    }
    setIsSaving(true);
    const id = editingId ?? crypto.randomUUID();
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload: Asset = {
      id,
      title: form.title.trim(),
      description: form.description.trim(),
      tags,
      last_updated: new Date().toISOString(),
      owner: userName ?? "Unknown",
      link: form.link.trim(),
      user_id: assets.find((a) => a.id === id)?.user_id ?? userId ?? null,
    } as Asset;

    if (editingId) {
      await supabase.from("knowledge_assets").update(payload).eq("id", id);
      setAssets((prev) => prev.map((a) => (a.id === id ? payload : a)));
      toast.success("Asset updated");
    } else {
      await supabase.from("knowledge_assets").insert(payload);
      setAssets((prev) => [payload, ...prev]);
      toast.success("Asset added");
    }
    resetForm();
  };

  const startEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setForm({
      title: asset.title,
      description: asset.description,
      tags: asset.tags.join(", "),
      link: asset.link,
    });
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    const supabase = createClient();
    await supabase.from("knowledge_assets").delete().eq("id", id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) resetForm();
    setIsDeleting(null);
    toast.success("Asset deleted");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">The Brain</p>
        <h2 className="text-3xl font-black">Central Knowledge Hub</h2>
        <p className="text-muted-foreground">
          Search across high-value assets. Tags glow to guide curation. Powered by Supabase full-text.
        </p>
      </header>

      {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle>{editingId ? "Edit asset" : "Add asset"}</CardTitle>
            <CardDescription>Admins can add, edit, or delete assets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <Input
              placeholder="Tags (comma separated)"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <Input
              placeholder="Asset URL"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
                {editingId ? "Save changes" : "Add asset"}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={resetForm} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/90 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pitch decks, templates, models, playbooks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 border-border bg-background pl-10 text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
          />
        </div>
        <ScrollArea>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={activeTag ? "outline" : "default"}
              onClick={() => setActiveTag(null)}
              className="rounded-full"
            >
              All tags
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {filtered.map((asset, idx) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="h-full overflow-hidden border-border bg-card shadow-lg backdrop-blur hover:-translate-y-1 hover:shadow-primary/20 dark:border-white/10 dark:bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-start gap-2 text-lg">
                    <BookMarked className="h-5 w-5 shrink-0 text-primary" />
                    <span className="flex-1 break-words">{asset.title}</span>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{asset.description}</CardDescription>
                  {canEdit() && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(asset)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(asset.id)}
                        disabled={isDeleting === asset.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting === asset.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {asset.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-accent/20 text-foreground dark:bg-white/10 dark:text-white">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Owner: {asset.owner}</span>
                    <span>Updated {new Date(asset.last_updated).toLocaleDateString()}</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full border-primary/40 text-primary">
                    <Link href={asset.link} target="_blank" rel="noreferrer">
                      Open asset <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <Card className="border-dashed border-white/20 bg-white/5 text-center">
          <CardContent className="py-10 text-muted-foreground">
            Nothing yet—seed Supabase with your top assets.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

