import { Card, CardContent } from "@/components/ui/card";

/** Esqueleto de carga genérico para páginas que leen datos en el cliente. */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando">
      <div className="h-9 w-48 rounded-lg bg-muted" />
      <div className="h-4 w-72 rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function PageError({ error }: { error: unknown }) {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error instanceof Error ? error.message : "No se pudieron cargar los datos."}
        </CardContent>
      </Card>
    </div>
  );
}
