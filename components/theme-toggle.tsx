"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
] as const;

// Evita desajustes de hidratación: el tema solo se conoce en el cliente.
const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

/** Selector segmentado Claro / Oscuro / Sistema. */
export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = mounted ? theme ?? "system" : "system";

  return (
    <div role="radiogroup" aria-label="Tema de color" className={cn("inline-flex rounded-xl bg-muted p-1", className)}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
