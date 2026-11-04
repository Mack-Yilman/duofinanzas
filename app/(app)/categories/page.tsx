"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { addCategoryAction, deleteCategoryAction } from "@/lib/actions/categories";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { PageError, PageSkeleton } from "@/components/page-state";

export default function CategoriesPage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);

  if (error) return <PageError error={error} />;
  if (isLoading || !data) return <PageSkeleton />;
  const { categories } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground mt-2">Gestionen las categorías de sus gastos.</p>
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
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{cat.icon}</div>
                <div className="font-medium">{cat.name}</div>
              </div>
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={cat.id} />
                <Button variant="ghost" size="icon" type="submit" aria-label="Eliminar" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
