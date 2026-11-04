"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/repos/users";
import { ME_KEY } from "@/lib/session";
import { setNavigator } from "@/lib/nav";
import { ConsentGate } from "@/components/consent-gate";
import { StorageNotice } from "@/components/storage-notice";

function SessionSync() {
  const router = useRouter();

  useEffect(() => {
    setNavigator((href) => router.push(href));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ME_KEY });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionSync />
      {children}
      <ConsentGate />
      <StorageNotice />
    </QueryClientProvider>
  );
}

/** Perfil del usuario autenticado (null = sin sesión). */
export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: getCurrentUser, staleTime: 5 * 60_000 });
}
