"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { expensesToCsv, exportFileName } from "@/lib/domain/export";
import type { Category, Expense } from "@/lib/types";

/** Exporta los gastos visibles: CSV (Excel) o PDF con el diálogo de impresión del navegador. */
export function ExportButtons({
  expenses,
  categories,
  names,
  label,
}: {
  expenses: Expense[];
  categories: Category[];
  names: Record<string, string>;
  label: string;
}) {
  function downloadCsv() {
    const blob = new Blob([expensesToCsv(expenses, categories, names)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName(label);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={downloadCsv} disabled={!expenses.length}>
        <Download className="h-4 w-4" aria-hidden /> CSV
      </Button>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()} disabled={!expenses.length}>
        <Printer className="h-4 w-4" aria-hidden /> PDF
      </Button>
    </div>
  );
}
