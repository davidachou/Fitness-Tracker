import { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default function IntranetLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <IntranetLayoutContent>{children}</IntranetLayoutContent>
    </Suspense>
  );
}

async function IntranetLayoutContent({
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

