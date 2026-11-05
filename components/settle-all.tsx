"use client";

import { useState, useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptInput } from "@/components/receipt-input";
import { settleAllAction } from "@/lib/actions/expenses";
import { formatMoney } from "@/lib/domain/money";

type Breakdown = Record<string, { owedToYou: number; youOwe: number }>;

/** "Liquidar todo": salda de una vez todos los gastos compartidos pendientes. */
export function SettleAll({ breakdown, pendingCount, partnerName }: { breakdown: Breakdown; pendingCount: number; partnerName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  if (pendingCount === 0) return null;

  const lines = Object.entries(breakdown)
    .map(([cur, b]) => ({ cur, net: Math.round((b.owedToYou - b.youOwe) * 100) / 100 }))
    .filter((x) => x.net !== 0);

  return (
    <div id="liquidar" className="rounded-2xl border border-border bg-card p-4 print:hidden">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <strong>{pendingCount}</strong> {pendingCount === 1 ? "gasto compartido pendiente" : "gastos compartidos pendientes"} de liquidar.
          </p>
          <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
            <CheckCheck className="h-4 w-4" aria-hidden /> Liquidar todo
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              await settleAllAction(fd);
              setOpen(false);
            });
          }}
        >
          <div className="space-y-1 text-sm">
            <p className="font-medium">Se marcarán {pendingCount} gastos como pagados.</p>
            {lines.map((x) => (
              <p key={x.cur} className="text-muted-foreground">
                {x.net > 0 ? `${partnerName} te paga ` : `Pagas a ${partnerName} `}
                <strong className="text-foreground">{formatMoney(Math.abs(x.net), x.cur)}</strong>
              </p>
            ))}
          </div>
          <ReceiptInput label="Constancia de la transferencia (opcional)" hint="Captura del Yape/Plin o transferencia." disabled={pending} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Liquidando…" : "Confirmar liquidación"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
