"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, Wallet, Target, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Gastos", href: "/expenses", icon: CreditCard },
  { label: "Ingresos", href: "/income", icon: Wallet },
  { label: "Metas", href: "/goals", icon: Target },
  { label: "Ajustes", href: "/settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-200",
                active ? "opacity-100" : "opacity-0"
              )}
              aria-hidden
            />
            <Icon className={cn("h-[18px] w-[18px] transition-colors", active && "text-primary")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/60 bg-card/80 px-2 py-2.5 pb-safe backdrop-blur-xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-3 py-1 transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
