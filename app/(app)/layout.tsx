"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Shield } from "lucide-react";
import { SidebarLinks, BottomNav } from "@/components/app-nav";
import { useMe } from "@/components/auth-provider";
import { PageSkeleton } from "@/components/page-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { LegalFooter } from "@/components/legal-footer";
import { avatarBg } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { runRecurring } from "@/lib/recurring-runner";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="DúoFinanzas, inicio">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm" aria-hidden>
        D
      </span>
      <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
        Dúo<span className="text-primary">Finanzas</span>
      </span>
    </Link>
  );
}

/**
 * Guardia de cliente (en un sitio estático no hay middleware): sin sesión → /login;
 * sin pareja → /setup. La seguridad real la imponen las políticas RLS de Supabase.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, isLoading } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (!me || me.mfaPending) router.replace("/login");
    else if (!me.coupleId) router.replace("/setup");
  }, [me, isLoading, router]);

  // Gastos recurrentes vencidos: se registran una vez por carga de la app.
  useEffect(() => {
    if (me?.coupleId && !me.mfaPending) void runRecurring(me);
  }, [me]);

  const ready = !isLoading && me?.coupleId && !me.mfaPending;
  const showFab = ready && !/^\/(expenses\/(new|edit)|settings|admin)/.test(pathname);

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background md:flex-row print:block print:h-auto print:overflow-visible">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute left-[-12%] top-[-12%] h-[42%] w-[42%] rounded-full bg-[var(--user-a)] opacity-[0.10] blur-[130px]" />
        <div className="absolute bottom-[-14%] right-[-10%] h-[44%] w-[44%] rounded-full bg-brand-600 opacity-[0.12] blur-[130px]" />
      </div>

      {/* Barra superior (móvil) */}
      <header className="print:hidden z-20 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl md:hidden">
        <Logo />
        <ThemeToggle compact />
      </header>

      {/* Sidebar (desktop) */}
      <aside className="print:hidden z-10 hidden w-64 flex-col border-r border-border/60 bg-sidebar/80 px-4 py-7 backdrop-blur-xl md:flex">
        <div className="mb-9 px-3">
          <Logo />
        </div>

        <SidebarLinks />

        {me?.isAdmin && (
          <Link
            href="/admin"
            className="mt-2 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <Shield className="h-[18px] w-[18px]" aria-hidden />
            <span>Administración</span>
          </Link>
        )}

        <div className="mt-auto space-y-4 border-t border-border/60 px-2 pt-4">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Tema</span><ThemeToggle compact /></div>
          {me && (
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm",
                  avatarBg(me.avatarColor)
                )}
                aria-hidden
              >
                {me.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-foreground">{me.name}</p>
                <p className="truncate text-xs text-muted-foreground">{me.email}</p>
              </div>
            </div>
          )}
          <LegalFooter className="justify-start" />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 print:overflow-visible print:pb-0">{ready ? children : <PageSkeleton />}</main>

      {/* Acción principal en móvil: nuevo gasto */}
      {showFab && (
        <Link
          href="/expenses/new"
          aria-label="Nuevo gasto"
          className="print:hidden fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 md:hidden"
        >
          <Plus className="h-6 w-6" />
        </Link>
      )}

      <BottomNav />
    </div>
  );
}
