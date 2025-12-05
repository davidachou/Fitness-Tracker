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
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-neutral-900 to-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(239,68,68,0.12),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.12),transparent_28%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12">
        <Card className="w-full border-white/10 bg-white/5 backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-black text-white">KK Advisory Intranet</CardTitle>
            <CardDescription className="text-base text-white/70">
              Private workspace for KK Advisory team members. Access requires a company Google
              account and an active invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center text-sm text-white/70">
            <p>
              If you have an invite, sign in with your KK Advisory Google account to continue. If you
              need access, contact an administrator to request an invite.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="bg-white text-black hover:bg-white/90">
                <Link href="/auth/login">Sign in with Google</Link>
              </Button>
              <Button
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10"
                asChild
              >
                <Link href="mailto:david@kkadvisory.org?subject=Intranet%20Access%20Request">
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
