"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ban, KeyRound, ShieldCheck, ShieldOff, Trash2, UserMinus, Unlock, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useMe } from "@/components/auth-provider";
import { queryClient } from "@/lib/query-client";
import { cn } from "@/lib/utils";
import {
  deleteUser,
  getAuditLog,
  getStats,
  listUsers,
  removeFromCouple,
  sendPasswordReset,
  setAdmin,
  setBanned,
  type AdminUser,
} from "@/lib/repos/admin";

const ACTION_LABEL: Record<string, string> = {
  ban: "Bloqueó",
  unban: "Desbloqueó",
  delete_user: "Eliminó",
  remove_from_couple: "Quitó de su pareja a",
  grant_admin: "Hizo admin a",
  revoke_admin: "Quitó admin a",
  bootstrap_admin: "Alta del admin inicial",
};

const fmt = (d: Date | null) =>
  d ? d.toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

async function run(label: string, fn: () => Promise<void>, confirmText?: string) {
  if (confirmText && !confirm(confirmText)) return;
  try {
    await fn();
    toast.success(label);
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "No se pudo completar la acción");
  }
}

function IconAction({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted",
        danger ? "hover:text-destructive" : "hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function UserRow({ u, selfId }: { u: AdminUser; selfId: string }) {
  const isSelf = u.id === selfId;
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{u.name || "(sin nombre)"}</p>
          {u.isAdmin && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Admin</span>}
          {u.banned && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">Bloqueado</span>}
          {!u.emailConfirmed && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Sin confirmar</span>}
          {isSelf && <span className="text-[11px] text-muted-foreground">(tú)</span>}
        </div>
        <p className="truncate text-sm text-muted-foreground">{u.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {u.coupleName ? `Pareja: ${u.coupleName} (${u.role === "owner" ? "creador" : "miembro"})` : "Sin pareja"} · Alta {fmt(u.createdAt)} · Último acceso {fmt(u.lastSignInAt)}
        </p>
      </div>

      {!isSelf && (
        <div className="flex shrink-0 items-center gap-1">
          <IconAction label="Enviar correo para restablecer contraseña" onClick={() => run("Correo de recuperación enviado", () => sendPasswordReset(u.email))}>
            <KeyRound className="h-4 w-4" />
          </IconAction>
          {u.banned ? (
            <IconAction label="Desbloquear" onClick={() => run("Usuario desbloqueado", () => setBanned(u.id, false))}>
              <Unlock className="h-4 w-4" />
            </IconAction>
          ) : (
            <IconAction
              label="Bloquear (cierra sus sesiones)"
              danger
              onClick={() => run("Usuario bloqueado", () => setBanned(u.id, true), `¿Bloquear a ${u.email}? Se cerrarán sus sesiones.`)}
            >
              <Ban className="h-4 w-4" />
            </IconAction>
          )}
          {u.coupleId && (
            <IconAction
              label="Quitar de su pareja"
              danger
              onClick={() =>
                run("Usuario quitado de la pareja", () => removeFromCouple(u.id), `¿Quitar a ${u.email} de "${u.coupleName}"? Si era el último miembro, la pareja y sus datos se eliminan.`)
              }
            >
              <UserMinus className="h-4 w-4" />
            </IconAction>
          )}
          {u.isAdmin ? (
            <IconAction label="Quitar rol de administrador" onClick={() => run("Rol de admin retirado", () => setAdmin(u.id, false), `¿Quitar el rol de admin a ${u.email}?`)}>
              <ShieldOff className="h-4 w-4" />
            </IconAction>
          ) : (
            <IconAction label="Hacer administrador" onClick={() => run("Ahora es administrador", () => setAdmin(u.id, true), `¿Dar rol de administrador a ${u.email}?`)}>
              <ShieldCheck className="h-4 w-4" />
            </IconAction>
          )}
          <IconAction
            label="Eliminar cuenta"
            danger
            onClick={() =>
              run("Cuenta eliminada", () => deleteUser(u.id), `¿Eliminar DEFINITIVAMENTE la cuenta de ${u.email}? Esta acción no se puede deshacer.`)
            }
          >
            <Trash2 className="h-4 w-4" />
          </IconAction>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const [q, setQ] = useState("");
  const enabled = !!me?.isAdmin;

  useEffect(() => {
    if (!meLoading && !me) router.replace("/login");
  }, [me, meLoading, router]);

  const users = useQuery({ queryKey: ["admin", "users"], queryFn: listUsers, enabled });
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: getStats, enabled });
  const audit = useQuery({ queryKey: ["admin", "audit"], queryFn: () => getAuditLog(30), enabled });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!users.data || !term) return users.data ?? [];
    return users.data.filter((u) => [u.name, u.email, u.coupleName ?? ""].some((v) => v.toLowerCase().includes(term)));
  }, [users.data, q]);

  if (meLoading || !me) return <PageSkeleton />;
  if (!me.isAdmin) {
    return <PageError error={new Error("Acceso denegado: esta sección es solo para administradores.")} />;
  }
  if (users.error) return <PageError error={users.error} />;

  const s = stats.data;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Link href={me.coupleId ? "/" : "/setup"} aria-label="Volver" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
          <p className="mt-1 text-muted-foreground">Gestiona las cuentas. Por privacidad, el panel no muestra datos financieros de las parejas.</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          ["Usuarios", s?.users],
          ["Parejas", s?.couples],
          ["Gastos registrados", s?.expenses],
          ["Activos (7 días)", s?.active7d],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular">{value ?? "…"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>{users.data ? `${users.data.length} cuentas` : "Cargando…"}</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, correo o pareja" className="pl-8" aria-label="Buscar usuarios" />
          </div>
        </CardHeader>
        <CardContent>
          {users.isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            filtered.map((u) => <UserRow key={u.id} u={u} selfId={me.id} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registro de auditoría</CardTitle>
          <CardDescription>Últimas acciones de administración.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(audit.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin acciones registradas.</p>
          ) : (
            audit.data!.map((a) => {
              const target = users.data?.find((u) => u.id === a.targetUser)?.email ?? (a.detail.email as string | undefined) ?? "";
              return (
                <div key={a.id} className="flex flex-col gap-0.5 border-b border-border/60 pb-2 text-sm last:border-0 sm:flex-row sm:justify-between">
                  <span>
                    <span className="font-medium">{a.adminEmail ?? "Sistema"}</span> · {ACTION_LABEL[a.action] ?? a.action} {target}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmt(a.createdAt)}</span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
