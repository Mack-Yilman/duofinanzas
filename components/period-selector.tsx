import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Selector de periodo: alterna entre "Mensual" (periodo según día de corte, con
 * navegación a periodos anteriores) y "Global" (todo el histórico). Navega por
 * query params, sin estado de cliente.
 */
export function PeriodSelector({
  basePath,
  view,
  offset,
  label,
}: {
  basePath: string;
  view: "current" | "global";
  offset: number;
  label: string;
}) {
  const isGlobal = view === "global";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl bg-muted p-1">
        <Link
          href={`${basePath}?view=current`}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            !isGlobal ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Mensual
        </Link>
        <Link
          href={`${basePath}?view=global`}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            isGlobal ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Global
        </Link>
      </div>

      {!isGlobal && (
        <div className="inline-flex items-center gap-1">
          <Link
            href={`${basePath}?view=current&offset=${offset - 1}`}
            aria-label="Periodo anterior"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[150px] text-center text-sm font-medium">{label}</span>
          <Link
            href={offset < 0 ? `${basePath}?view=current&offset=${offset + 1}` : "#"}
            aria-label="Periodo siguiente"
            aria-disabled={offset >= 0}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              offset < 0
                ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                : "pointer-events-none opacity-30"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
