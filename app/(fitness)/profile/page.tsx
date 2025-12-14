"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  avatar_url?: string | null;
  bio?: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bioDraft, setBioDraft] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          avatar_url: data.avatar_url,
          bio: data.bio,
        });
        setBioDraft(data.bio || "");
        setLoading(false);
        return;
      }

      // If no profile exists yet, try to create it from auth metadata
      const resp = await fetch("/api/dashboard/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          userMetadata: user.user_metadata,
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.profile) {
          setProfile(json.profile);
          setBioDraft(json.profile.bio || "");
        }
      }

      setLoading(false);
    };
    loadProfile();
  }, []);


  const updateBio = async () => {
    if (!profile) return;
    setSavingBio(true);
    const supabase = createClient();
    const normalized = bioDraft.trim();
    const { error } = await supabase
      .from("profiles")
      .update({ bio: normalized || null })
      .eq("id", profile.id);

    setSavingBio(false);

    if (error) {
      toast.error("Failed to update bio");
      return;
    }

    setProfile({ ...profile, bio: normalized || null });
    toast.success("Bio updated");
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Loading your profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-10 text-center text-destructive">
        Could not load profile. Try reloading.
      </div>
    );
  }

  const initials =
    profile.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2) ||
    (profile.email || "U")[0].toUpperCase();

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="border-border bg-card backdrop-blur dark:border-white/10 dark:bg-white/5">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16 border border-white/20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {profile.role || "Team Member"}
            </CardDescription>
            <div className="text-sm text-muted-foreground">{profile.email}</div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-border bg-card backdrop-blur dark:border-white/10 dark:bg-white/5">
        <CardHeader>
          <CardTitle>Bio</CardTitle>
          <CardDescription>Tell us about your fitness goals and background.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Tell us about your fitness goals and background."
            value={bioDraft}
            onChange={(e) => setBioDraft(e.target.value)}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-white dark:placeholder:text-white/70"
            rows={4}
          />
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Optional information about your fitness journey.</div>
            <Button onClick={updateBio} disabled={savingBio}>
              {savingBio ? "Saving…" : "Save bio"}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

