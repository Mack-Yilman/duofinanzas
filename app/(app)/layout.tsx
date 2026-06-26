import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Home, CreditCard, Wallet, Target, Repeat, Settings, List } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const navItems = [
    { label: "Inicio", href: "/", icon: <Home className="w-5 h-5" /> },
    { label: "Gastos", href: "/expenses", icon: <CreditCard className="w-5 h-5" /> },
    { label: "Ingresos", href: "/income", icon: <Wallet className="w-5 h-5" /> },
    { label: "Metas", href: "/goals", icon: <Target className="w-5 h-5" /> },
    { label: "Ajustes", href: "/settings", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen flex-col md:flex-row w-full bg-background relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-user-b/20 blur-[120px]"></div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-card/40 backdrop-blur-xl px-4 py-6 z-10 shadow-2xl">
        <div className="text-2xl font-bold text-brand-600 mb-8 px-4">DúoFinanzas</div>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-${(session.user as any).avatarColor}-500`}>
              {session.user.name?.[0]?.toUpperCase()}
            </div>
            <div className="text-sm">
              <p className="font-medium">{session.user.name}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/5 bg-card/60 backdrop-blur-xl flex items-center justify-around p-3 pb-safe z-50">
        {navItems.slice(0, 4).map((item) => (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
        <Link href="/settings" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium">Más</span>
        </Link>
      </nav>
    </div>
  );
}
