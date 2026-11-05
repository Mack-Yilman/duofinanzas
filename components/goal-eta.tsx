import { CalendarClock } from "lucide-react";
import { goalEta } from "@/lib/domain/stats";
import { formatMoney } from "@/lib/domain/money";
import type { Goal, GoalContribution } from "@/lib/types";

const fmt = (d: Date) => d.toLocaleDateString("es-PE", { month: "long", year: "numeric" });

/** Fecha estimada para completar la meta según el ritmo de aportes de los últimos 3 meses. */
export function GoalEta({ goal, contributions }: { goal: Goal; contributions: GoalContribution[] }) {
  const r = goalEta(goal, contributions);
  if (r.status === "done") return null;
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {r.status === "no_pace" ? (
        <span>Sin aportes en los últimos 3 meses: aún no hay una fecha estimada.</span>
      ) : (
        <span>
          Al ritmo de {formatMoney(r.monthly, goal.currency)}/mes la alcanzarán en{" "}
          <strong className="font-medium text-foreground">{fmt(r.eta)}</strong> ({r.months} {r.months === 1 ? "mes" : "meses"}).
          {r.late && <span className="text-amber-600 dark:text-amber-400"> Después de la fecha objetivo.</span>}
        </span>
      )}
    </p>
  );
}
