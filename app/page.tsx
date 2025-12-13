import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--accent)/0.08),transparent_32%),radial-gradient(circle_at_80%_0%,hsl(var(--primary)/0.08),transparent_28%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12">
        <Card className="w-full border-border/50 bg-card/80 backdrop-blur shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-black text-foreground">Fitness Tracker</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Your personal fitness tracking workspace. Access requires a Google account
              and an active invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
            <p>
              If you have an invite, sign in with your Google account to continue. If you
              need access, contact an administrator to request an invite.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/auth/login">Sign in with Google</Link>
              </Button>
              <Button
                variant="outline"
                asChild
              >
                <Link href="mailto:admin@yourdomain.com?subject=Fitness%20Tracker%20Access%20Request">
                  Request access
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
