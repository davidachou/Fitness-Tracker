"use client";

import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminUIModeProvider } from "@/hooks/use-admin-ui-mode";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 2,
            staleTime: 30_000,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AdminUIModeProvider>
          <TooltipProvider delayDuration={100}>{children}</TooltipProvider>
          <Toaster richColors position="top-right" closeButton />
          <ReactQueryDevtools initialIsOpen={false} />
        </AdminUIModeProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
