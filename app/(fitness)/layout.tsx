import { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default function FitnessLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <FitnessLayoutContent>{children}</FitnessLayoutContent>
    </Suspense>
  );
}

async function FitnessLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <AppShell user={{ id: user.id, email: user.email }}>{children}</AppShell>;
}

