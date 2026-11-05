"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Wallet, Plus, Briefcase, Globe, TrendingUp, Coins, Trash2, Pencil } from "lucide-react";
import { deleteIncomeAction } from "@/lib/actions/incomes";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { PageError, PageSkeleton } from "@/components/page-state";
import { formatMoney } from "@/lib/domain/money";
import Link from "next/link";
import { EmptyState } from "@/components/page-header";

const TYPE_LABEL: Record<string, string> = { salary: "Salario", freelance: "Freelance", bonus: "Bono", other: "Otro" };

export default function IncomePage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);

  if (error) return <PageError error={error} />;
  if (isLoading || !data) return <PageSkeleton />;

  // Solo ingresos de la pareja (antes se listaban los de TODOS los usuarios de la base).
  const { incomes, users } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ingresos</h1>
          <p className="mt-1.5 text-muted-foreground">Gestionen sus fuentes de ingresos declaradas.</p>
        </div>
        <Link href="/income/new" className={buttonVariants({ className: "gap-2" })}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Ingreso</span>
        </Link>
      </div>

      <div className="space-y-4">
        {incomes.length === 0 ? (
          <EmptyState icon={<Wallet className="h-5 w-5" />} title="Aún no hay ingresos declarados">
            Los ingresos mensuales definen la proporción justa de aportes de cada uno.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {incomes.map(inc => (
              <Card key={inc.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {inc.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {inc.type === "salary" && <Briefcase className="w-4 h-4 text-muted-foreground" />}
                    {inc.type === "freelance" && <Globe className="w-4 h-4 text-muted-foreground" />}
                    {inc.type === "bonus" && <TrendingUp className="w-4 h-4 text-muted-foreground" />}
                    {inc.type === "other" && <Coins className="w-4 h-4 text-muted-foreground" />}
                    <Link href={`/income/edit?id=${inc.id}`} title="Editar" aria-label={`Editar ${inc.name}`} className="text-muted-foreground hover:text-brand-500">
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <form action={deleteIncomeAction}>
                      <input type="hidden" name="id" value={inc.id} />
                      <button type="submit" title="Eliminar" aria-label="Eliminar" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-medium text-brand-400 mb-1">
                        {users.find(u => u.id === inc.userId)?.name || "Desconocido"}
                      </p>
                      <p className="text-xs text-muted-foreground">{TYPE_LABEL[inc.type] || inc.type} • {inc.period === 'one_time' ? 'Ocasional' : 'Mensual'}</p>
                      <p className="text-xs font-medium mt-1">{inc.effectiveDate.toLocaleDateString("es-PE")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(inc.amount, inc.currency)}</p>
                      <p className="text-xs text-muted-foreground">{inc.isActive ? 'Activo' : 'Inactivo'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
