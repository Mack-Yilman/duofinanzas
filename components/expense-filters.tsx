"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { hasFilters, parseFilters } from "@/lib/domain/filters";
import type { Category, User } from "@/lib/types";

const sel =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Búsqueda y filtros de gastos; el estado vive en la URL (?q=&cat=&who=&status=). */
export function ExpenseFilters({ categories, users }: { categories: Category[]; users: Pick<User, "id" | "name">[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const f = parseFilters(sp);
  const [q, setQ] = useState(f.q);

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v && v !== "all") next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Búsqueda con espera de 300 ms para no navegar en cada tecla.
  useEffect(() => {
    if (q === f.q) return;
    const t = setTimeout(() => update({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden" role="search">
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar gasto o categoría"
          aria-label="Buscar gastos"
          className="h-9 pl-8"
          maxLength={80}
        />
      </div>
      <select aria-label="Filtrar por categoría" className={sel} value={f.category} onChange={(e) => update({ cat: e.target.value })}>
        <option value="">Todas las categorías</option>
        <option value="none">Sin categoría</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
      </select>
      <select aria-label="Filtrar por quién pagó" className={sel} value={f.payer} onChange={(e) => update({ who: e.target.value })}>
        <option value="">Pagó cualquiera</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>Pagó {u.name || "—"}</option>
        ))}
      </select>
      <select aria-label="Filtrar por estado" className={sel} value={f.status} onChange={(e) => update({ status: e.target.value })}>
        <option value="all">Todos</option>
        <option value="pending">Pendientes de liquidar</option>
        <option value="settled">Liquidados</option>
        <option value="personal">Personales</option>
      </select>
      {hasFilters(f) && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            update({ q: "", cat: "", who: "", status: "" });
          }}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden /> Limpiar
        </button>
      )}
    </div>
  );
}
