import Link from "next/link";
import { BellRing } from "lucide-react";

/** Aviso cuando faltan pocos días para el cierre del periodo y hay saldos sin liquidar. */
export function SettleReminder({ daysLeft }: { daysLeft: number }) {
  const when = daysLeft === 0 ? "hoy cierra el periodo" : daysLeft === 1 ? "mañana cierra el periodo" : `faltan ${daysLeft} días para el cierre`;
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <p>
        <strong className="font-semibold">Hora de liquidar:</strong> {when} y tienen saldos pendientes.{" "}
        <Link href="/expenses?view=global" className="font-medium text-primary underline-offset-2 hover:underline">
          Revisar gastos sin liquidar
        </Link>
      </p>
    </div>
  );
}
