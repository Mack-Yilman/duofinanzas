"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { SidebarLinks, BottomNav } from "@/components/app-nav";
import { useMe } from "@/components/auth-provider";
import { PageSkeleton } from "@/components/page-state";
import { avatarBg } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * Guardia de cliente (reemplaza al middleware, que no existe en un sitio estático):
 * sin sesión → /login; sin pareja → /setup. La seguridad real la imponen las
 * políticas RLS de Supabase, no esta redirección.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me, isLoading } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (!me) router.replace("/login");
    else if (!me.coupleId) router.replace("/setup");
  }, [me, isLoading, router]);

  const ready = !isLoading && me?.coupleId;

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background md:flex-row">
      {/* Glows ambientales cálidos (dorado + bosque) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-12%] top-[-12%] h-[42%] w-[42%] rounded-full bg-[var(--user-a)] opacity-[0.12] blur-[130px]" />
        <div className="absolute bottom-[-14%] right-[-10%] h-[44%] w-[44%] rounded-full bg-brand-600 opacity-[0.14] blur-[130px]" />
      </div>

      {/* Sidebar (desktop) */}
      <aside className="z-10 hidden w-64 flex-col border-r border-border/60 bg-sidebar/70 px-4 py-7 backdrop-blur-xl md:flex">
        <div className="mb-9 flex items-center gap-2.5 px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm">
            D
          </span>
          <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Dúo<span className="text-primary">Finanzas</span>
          </span>
        </div>

        <SidebarLinks />

        {me?.isAdmin && (
          <Link
            href="/admin"
            className="mt-2 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <Shield className="h-[18px] w-[18px]" />
            <span>Administración</span>
          </Link>
        )}

        {me && (
          <div className="mt-auto border-t border-border/60 px-2 pt-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm",
                  avatarBg(me.avatarColor)
                )}
              >
                {me.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-foreground">{me.name}</p>
                <p className="truncate text-xs text-muted-foreground">{me.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{ready ? children : <PageSkeleton />}</main>

      {/* Navegación inferior (móvil) */}
      <BottomNav />
    </div>
  );
}
