import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (user && !error) {
    // Get user profile to show name instead of email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';

    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">Hey, {displayName}!</span>
        <Button asChild size="sm" variant={"outline"}>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
    </div>
  );
}
