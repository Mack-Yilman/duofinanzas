"use client";

import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PageError, PageSkeleton } from "@/components/page-state";
import { ReceiptGallery } from "@/components/receipt-gallery";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { formatMoney } from "@/lib/domain/money";

/** Historial de liquidaciones: quién pagó a quién, cuánto, cuándo y qué gastos cerró. */
export default function SettlementsPage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);

  if (error) return <PageError error={error} />;
  if (isLoading || !data || !me) return <PageSkeleton />;

  const nameOf = (id: string) => (id === me.id ? "Tú" : data.users.find((u) => u.id === id)?.name || "Ex miembro");
  const names = Object.fromEntries(data.users.map((u) => [u.id, u.name]));
  const settlements = data.settlements ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Liquidaciones"
        description="Cada vez que saldan cuentas queda registrado aquí, por moneda."
        actions={
          <Link href="/expenses?view=global&status=pending#liquidar" className={buttonVariants({ variant: "outline" })}>
            Ver pendientes
          </Link>
        }
      />

      {settlements.length === 0 ? (
        <EmptyState icon={<History className="h-5 w-5" />} title="Aún no hay liquidaciones">
          Cuando marquen gastos como pagados o usen “Liquidar todo”, aparecerán aquí.
        </EmptyState>
      ) : (
        <ul className="space-y-3" aria-label="Historial de liquidaciones">
          {settlements.map((s) => {
            const expenses = data.expenses.filter((e) => e.settlementId === s.id);
            const ids = new Set(expenses.map((e) => e.id));
            const receipts = (data.receipts ?? []).filter((r) => r.kind === "settlement" && r.expenseId && ids.has(r.expenseId));
            return (
              <li key={s.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-medium">
                        {nameOf(s.fromUserId)} <ArrowRight className="h-4 w-4 text-muted-foreground" aria-label="pagó a" /> {nameOf(s.toUserId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.createdAt.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
                        {s.expenseCount === 1 ? "1 gasto" : `${s.expenseCount} gastos`}
                        {expenses.length > 0 && `: ${expenses.slice(0, 3).map((e) => e.name).join(", ")}${expenses.length > 3 ? "…" : ""}`}
                      </p>
                      <ReceiptGallery receipts={receipts} names={names} />
                    </div>
                    <p className="text-lg font-semibold tabular-nums">
                      {s.amount === 0 ? "Sin saldo" : formatMoney(s.amount, s.currency)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
