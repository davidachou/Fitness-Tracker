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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sampleWins } from "@/lib/sample-data";
import { toast } from "sonner";
import { format } from "date-fns";
import { Sparkles, Upload, Pencil, Trash2, X } from "lucide-react";
import Image from "next/image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";
import { shouldShowAdminFeatures } from "@/lib/utils";

type WinPost = {
  id: string;
  title: string;
  content: string | null;
  author: string | null;
  date: string;
  image?: string | null;
  excerpt?: string | null;
  featured?: boolean | null;
  tags?: string[] | null;
};

export default function WinsPage() {
  const [posts, setPosts] = useState<WinPost[]>(sampleWins);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const { adminUIMode } = useAdminUIMode();
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      Placeholder.configure({ placeholder: "Share the win, the lesson, or the celebration…" }),
    ],
    content: "",
  });

  useEffect(() => {
    const supabase = createClient();
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("wins_posts")
        .select("*")
        .order("date", { ascending: false });
      if (data && data.length > 0) {
        setPosts(data as WinPost[]);
      }
    };
    const fetchProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", userData.user.id)
          .single();
        setIsAdmin(Boolean(profile?.is_admin));
      }
    };
    fetchPosts();
    fetchProfile();
  }, []);

  // Track editor emptiness for placeholder overlay
  useEffect(() => {
    if (!editor) return;
    const updateEmpty = () => setIsEditorEmpty(editor.isEmpty);
    updateEmpty();
    editor.on("update", updateEmpty);
    return () => {
      editor.off("update", updateEmpty);
    };
  }, [editor]);

  const handleSubmit = async () => {
    const supabase = createClient();
    setIsSaving(true);
    const isEditing = Boolean(editingId);
    const id = editingId ?? crypto.randomUUID();

    const content = editor?.getHTML() || "";
    if (!title || !content) {
      toast.error("Add a title and some content first");
      setIsSaving(false);
      return;
    }

    const payload: WinPost = {
      id,
      title,
      content,
      author: "You",
      date: isEditing
        ? posts.find((p) => p.id === id)?.date ?? new Date().toISOString()
        : new Date().toISOString(),
      image: image.trim() ? image.trim() : null,
    };

    if (isEditing) {
      await supabase.from("wins_posts").update(payload).eq("id", id);
      setPosts((prev) => prev.map((p) => (p.id === id ? payload : p)));
      toast.success("Blog post updated");
    } else {
      await supabase.from("wins_posts").insert({
        ...payload,
        tags: payload.tags ?? [],
        featured: payload.featured ?? false,
      });
      setPosts((prev) => [payload, ...prev]);
      toast.success("Blog post published");
    }
    resetFormState();
  };

  const resetFormState = () => {
    setIsSaving(false);
    setEditingId(null);
    setTitle("");
    setImage("");
    editor?.commands.clearContent();
  };

  const handleEdit = (post: WinPost) => {
    setEditingId(post.id);
    setTitle(post.title);
    setImage(post.image ?? "");
    if (post.content) {
      editor?.commands.setContent(post.content);
    } else {
      editor?.commands.clearContent();
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    const supabase = createClient();
    await supabase.from("wins_posts").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) resetFormState();
    setIsDeleting(null);
    toast.success("Blog post deleted");
  };

  const handleCancelEdit = () => {
    resetFormState();
  };


  const timeline = useMemo(
    () =>
      [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [posts],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Content</p>
        <h2 className="text-3xl font-black">Trainer Blog</h2>
        <p className="text-muted-foreground">
          Create and manage fitness content, tips, and motivational posts for your clients.
        </p>
        {shouldShowAdminFeatures(isAdmin, adminUIMode) && <p className="text-xs text-muted-foreground">Admin: you can edit or delete any post.</p>}
      </header>

      {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Post" : "New Blog Post"}</CardTitle>
            <CardDescription>
              {editingId
                ? "Edit your blog post. Save changes or cancel."
                : "Create engaging fitness content for your clients."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Blog post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/60"
            />

            <Input
              placeholder="Image URL (optional)"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/60"
            />

            <div className="relative rounded-xl border border-border bg-background text-foreground dark:border-white/20 dark:bg-white/10 dark:text-white">
              {isEditorEmpty && (
                <span className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
                  Write your fitness tips, motivation, or training insights…
                </span>
              )}
              <EditorContent editor={editor} className="prose prose-invert max-w-none p-3 text-sm" />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="gap-2" disabled={isSaving}>
                <Upload className="h-4 w-4" />
                {editingId ? "Save changes" : "Publish"}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={handleCancelEdit} className="gap-2">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-transparent to-transparent" />
        <div className="space-y-4 pl-8">
          <AnimatePresence>
            {timeline.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="relative"
              >
                <div className="absolute -left-[33px] mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <Card className="overflow-hidden border-white/10 bg-white/5 backdrop-blur">
                  {post.image && post.image.trim().length > 0 && (
                    <div className="relative h-40 w-full overflow-hidden">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover transition duration-200 hover:scale-105"
                        sizes="100vw"
                        priority={false}
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{post.title}</CardTitle>
                    <CardDescription>
                      By {post.author ?? "Unknown"} • {format(new Date(post.date), "MMM d, yyyy")}
                    </CardDescription>
                    {shouldShowAdminFeatures(isAdmin, adminUIMode) && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(post)}
                          disabled={isSaving && editingId === post.id}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(post.id)}
                          disabled={isDeleting === post.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting === post.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      className="prose prose-invert max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

