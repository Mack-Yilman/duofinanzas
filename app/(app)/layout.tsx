import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarLinks, BottomNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

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

        <div className="mt-auto border-t border-border/60 px-2 pt-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm bg-${(session.user as any).avatarColor}-500`}>
              {session.user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-foreground">{session.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

      {/* Navegación inferior (móvil) */}
      <BottomNav />
    </div>
  );
}
