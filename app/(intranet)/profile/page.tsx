"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  expertise: string[];
  avatar_url?: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          expertise: data.expertise || [],
          avatar_url: data.avatar_url,
        });
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const updateExpertise = async (expertise: string[]) => {
    if (!profile) return;
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ expertise }).eq("id", profile.id);
    if (error) {
      toast.error("Failed to update expertise");
      return;
    }
    setProfile({ ...profile, expertise });
    toast.success("Expertise updated");
  };

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    const updated = [...(profile?.expertise || []), newSkill.trim()];
    await updateExpertise(updated);
    setNewSkill("");
  };

  const removeSkill = async (skill: string) => {
    if (!profile) return;
    const updated = profile.expertise.filter((s) => s !== skill);
    await updateExpertise(updated);
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
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16 border border-white/20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
            <CardDescription className="text-base text-white/70">
              {profile.role || "Team Member"}
            </CardDescription>
            <div className="text-sm text-muted-foreground">{profile.email}</div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <CardTitle>Expertise</CardTitle>
          <CardDescription>Click to remove; add new skills below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {profile.expertise.length === 0 && (
              <div className="text-sm text-muted-foreground">No skills yet.</div>
            )}
            {profile.expertise.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="cursor-pointer bg-primary/10 text-primary"
                onClick={() => removeSkill(skill)}
              >
                {skill} ✕
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
              className="border-white/20 bg-white/10 text-white placeholder:text-white/70"
            />
            <Button onClick={addSkill}>Add</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

