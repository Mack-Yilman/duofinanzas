"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { queryClient } from "@/lib/query-client";
import { navigate } from "@/lib/nav";
import { importExpenses } from "@/lib/actions/expenses";
import { buildImport, IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, type ImportResult } from "@/lib/domain/import";
import { formatMoney } from "@/lib/domain/money";
import { toDateString } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

export default function ImportPage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [includeDup, setIncludeDup] = useState(false);
  const [pending, start] = useTransition();

  if (error) return <PageError error={error} />;
  if (isLoading || !data || !me) return <PageSkeleton />;

  async function onFile(file: File | undefined) {
    setResult(null);
    if (!file) return;
    if (file.size > IMPORT_MAX_BYTES) return toast.error("El archivo supera 1 MB.");
    const visible = data!.expenses.filter((e) => e.isShared || e.paidById === me!.id);
    setResult(buildImport(await file.text(), { categories: data!.categories, users: data!.users, existing: visible, rules: data!.categoryRules }));
  }

  const toImport = result?.rows.filter((r) => includeDup || !r.duplicate) ?? [];
  const dupCount = result?.rows.filter((r) => r.duplicate).length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Importar gastos"
        description="Desde un CSV: el que exporta DúoFinanzas o uno con columnas Fecha, Descripción y Monto (opcionales: Moneda, Categoría, Pagó, Tipo)."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Elige el archivo</CardTitle>
          <CardDescription>Máximo {IMPORT_MAX_ROWS} filas y 1 MB. Nada se guarda hasta que confirmes.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm hover:border-primary">
            <FileUp className="h-5 w-5 text-primary" aria-hidden />
            <span>Seleccionar archivo .csv</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Archivo CSV"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Revisa la vista previa</CardTitle>
            <CardDescription>
              {result.rows.length} válidas · {dupCount} posibles duplicados · {result.errors.length} con errores
              {result.truncated && ` · se leyeron solo las primeras ${IMPORT_MAX_ROWS}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.errors.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" aria-label="Errores">
                {result.errors.slice(0, 10).map((e) => (
                  <li key={e.line}>Fila {e.line}: {e.message}</li>
                ))}
                {result.errors.length > 10 && <li>… y {result.errors.length - 10} más</li>}
              </ul>
            )}
            {result.rows.length > 0 && (
              <div className="max-h-96 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="p-2">Fecha</th><th className="p-2">Descripción</th><th className="p-2">Categoría</th>
                      <th className="p-2 text-right">Monto</th><th className="p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.line} className={cn("border-t border-border", r.duplicate && !includeDup && "opacity-50")}>
                        <td className="p-2 tabular-nums">{toDateString(r.date)}</td>
                        <td className="p-2">{r.name}{!r.isShared && <span className="ml-1 text-xs text-muted-foreground">(personal)</span>}</td>
                        <td className="p-2">{r.categoryName}</td>
                        <td className="p-2 text-right tabular-nums">{formatMoney(r.amount, r.currency)}</td>
                        <td className="p-2 text-xs">{r.duplicate ? "Duplicado" : "Nuevo"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {dupCount > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={includeDup} onChange={(e) => setIncludeDup(e.target.checked)} className="h-4 w-4" />
                Importar también los posibles duplicados
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Link href="/expenses" className={buttonVariants({ variant: "ghost" })}>Cancelar</Link>
              <Button
                disabled={pending || toImport.length === 0}
                onClick={() =>
                  start(async () => {
                    try {
                      const n = await importExpenses(toImport);
                      await queryClient.invalidateQueries();
                      toast.success(n === 1 ? "1 gasto importado" : `${n} gastos importados`);
                      navigate("/expenses?view=global");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "No se pudo importar");
                    }
                  })
                }
              >
                {pending ? "Importando…" : `Importar ${toImport.length}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
