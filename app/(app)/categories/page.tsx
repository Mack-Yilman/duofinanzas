"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { addCategoryAction, deleteCategoryAction } from "@/lib/actions/categories";
import { saveBudgetAction } from "@/lib/actions/budgets";
import { addCategoryRuleAction, deleteCategoryRuleAction } from "@/lib/actions/category-rules";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { PageError, PageSkeleton } from "@/components/page-state";

export default function CategoriesPage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);

  if (error) return <PageError error={error} />;
  if (isLoading || !data) return <PageSkeleton />;
  const { categories } = data;
  // RLS solo devuelve los compartidos y mis personales.
  const sharedBudget = Object.fromEntries((data.budgets ?? []).filter((b) => !b.userId).map((b) => [b.categoryId, b.amount]));
  const myBudget = Object.fromEntries((data.budgets ?? []).filter((b) => b.userId === me?.id).map((b) => [b.categoryId, b.amount]));
  const categoryName = Object.fromEntries(categories.map((c) => [c.id, `${c.icon} ${c.name}`]));
  const rules = data.categoryRules ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Categorías</h1>
          <p className="mt-1.5 text-muted-foreground">
            Gestionen las categorías y su presupuesto por periodo (en soles). Avisamos al 80 % y al 100 %.
            El compartido cuenta los gastos compartidos; el personal, solo tus gastos personales (tu pareja no lo ve).
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregar Categoría</CardTitle>
          <CardDescription>Crea una nueva categoría para organizar mejor sus finanzas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addCategoryAction} className="flex gap-4 items-end">
            <div className="space-y-2 w-24">
              <label className="text-sm font-medium">Icono</label>
              <Input name="icon" placeholder="Ej. 🍔" required defaultValue="🏷️" />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Nombre de la Categoría</label>
              <Input name="name" placeholder="Ej. Comida rápida" required />
            </div>
            <Button type="submit" className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Agregar</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map(cat => (
          <Card key={cat.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{cat.icon}</div>
                  <div className="font-medium">{cat.name}</div>
                </div>
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={cat.id} />
                  <Button variant="ghost" size="icon" type="submit" aria-label={`Eliminar ${cat.name}`} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </form>
              </div>
              {([
                { scope: "shared", label: "Compartido", value: sharedBudget[cat.id] },
                { scope: "personal", label: "Personal", value: myBudget[cat.id] },
              ] as const).map((b) => (
                <form key={b.scope} action={saveBudgetAction} className="flex items-center gap-2">
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <input type="hidden" name="scope" value={b.scope} />
                  <label htmlFor={`budget-${b.scope}-${cat.id}`} className="w-20 shrink-0 text-xs text-muted-foreground">
                    {b.label}
                    <span className="sr-only"> · Presupuesto{b.scope === "personal" ? " personal" : ""} de {cat.name}</span>
                  </label>
                  <Input
                    id={`budget-${b.scope}-${cat.id}`}
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="S/"
                    defaultValue={b.value ?? ""}
                    className="h-9"
                  />
                  <Button type="submit" size="sm" variant="outline">Guardar</Button>
                </form>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" aria-hidden /> Reglas al importar</CardTitle>
          <CardDescription>
            Si la descripción de un gasto importado contiene el texto, se le asigna la categoría
            (p. ej. “Wong” → Supermercado). Sin tildes ni mayúsculas; gana la regla más específica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={addCategoryRuleAction} className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1 space-y-2">
              <label htmlFor="rule-pattern" className="text-sm font-medium">Si contiene</label>
              <Input id="rule-pattern" name="pattern" placeholder="Ej. Wong" required minLength={2} maxLength={60} />
            </div>
            <div className="min-w-40 flex-1 space-y-2">
              <label htmlFor="rule-category" className="text-sm font-medium">Categoría</label>
              <select
                id="rule-category"
                name="categoryId"
                required
                defaultValue=""
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="" disabled>Elige…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <Button type="submit" className="gap-2"><Plus className="h-4 w-4" aria-hidden /> Agregar regla</Button>
          </form>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay reglas.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border" aria-label="Reglas de categorización">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    “{r.pattern}” → <strong>{categoryName[r.categoryId] ?? "Sin categoría"}</strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label={`Eliminar regla ${r.pattern}`}
                    onClick={() => deleteCategoryRuleAction(r.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
