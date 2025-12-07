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
import { Textarea } from "@/components/ui/textarea";
import { sampleWins } from "@/lib/sample-data";
import { toast } from "sonner";
import { format } from "date-fns";
import { Sparkles, Upload } from "lucide-react";
import Image from "next/image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

type WinPost = (typeof sampleWins)[number];

export default function WinsPage() {
  const [posts, setPosts] = useState<WinPost[]>(sampleWins);
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      Placeholder.configure({ placeholder: "Share the win, the lesson, or the celebration..." }),
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
    fetchPosts();
  }, []);

  const handleSubmit = async () => {
    const content = editor?.getHTML() || "";
    if (!title || !content) {
      toast.error("Add a title and some content first");
      return;
    }
    const supabase = createClient();
    const newPost: WinPost = {
      id: crypto.randomUUID(),
      title,
      content,
      author: "You",
      date: new Date().toISOString(),
      image: image || "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?sig=10",
    };
    setPosts((prev) => [newPost, ...prev]);
    await supabase.from("wins_posts").insert(newPost);
    toast.success("Win published");
    setTitle("");
    setImage("");
    editor?.commands.clearContent();
  };

  const timeline = useMemo(
    () =>
      posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [posts],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Celebrate</p>
        <h2 className="text-3xl font-black">Wins & Internal Blog</h2>
        <p className="text-muted-foreground">
          Capture new hires, Friday wins, and lessons learned with rich text.
        </p>
      </header>

      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle>New Post</CardTitle>
          <CardDescription>Authenticated users can publish instantly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/60"
          />
          <Textarea
            placeholder="Image URL (optional)"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/60"
          />
          <div className="rounded-xl border border-white/15 bg-white/5">
            <EditorContent editor={editor} className="prose prose-invert max-w-none p-3 text-sm" />
          </div>
          <Button onClick={handleSubmit} className="gap-2">
            <Upload className="h-4 w-4" /> Publish
          </Button>
        </CardContent>
      </Card>

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
                      By {post.author} • {format(new Date(post.date), "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      className="prose prose-invert max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: post.content }}
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

