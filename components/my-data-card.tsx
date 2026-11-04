"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteMyAccount, exportMyData } from "@/lib/actions/account";
import { LEGAL } from "@/lib/legal";

/** Derechos ARCO dentro de la app: acceso (exportar) y cancelación (eliminar cuenta). */
export function MyDataCard({ email }: { email: string }) {
  const [confirmText, setConfirmText] = useState("");
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis datos y privacidad</CardTitle>
        <CardDescription>
          Tus derechos según la Ley N.º 29733. Lee la <Link href="/privacidad" className="underline">Política de Privacidad</Link>,
          los <Link href="/terminos" className="underline">Términos</Link> y la{" "}
          <Link href="/cookies" className="underline">Política de Cookies</Link>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Descargar mis datos</p>
            <p className="text-xs text-muted-foreground">Archivo JSON con tu perfil, ingresos, gastos, metas y constancias.</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await exportMyData();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "No se pudo exportar");
                }
              })
            }
          >
            <Download className="h-4 w-4" aria-hidden /> Descargar
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div>
            <p className="text-sm font-medium text-destructive">Eliminar mi cuenta</p>
            <p className="text-xs text-muted-foreground">
              Borra tu cuenta, tu perfil, tus ingresos y aportes. Si eres el último miembro de tu pareja, se eliminan
              también los gastos, metas y constancias compartidos. Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Escribe ${email} para confirmar`}
              aria-label="Confirma escribiendo tu correo"
              autoComplete="off"
            />
            <Button
              variant="destructive"
              className="gap-2"
              disabled={pending || confirmText.trim().toLowerCase() !== email.toLowerCase()}
              onClick={() =>
                start(async () => {
                  const res = await deleteMyAccount();
                  if (res.error) toast.error(res.error);
                  else toast.success("Tu cuenta fue eliminada");
                })
              }
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Eliminar
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Para oposición, rectificación u otras consultas escribe a{" "}
          <a href={`mailto:${LEGAL.owner.email}`} className="underline">{LEGAL.owner.email}</a>.
        </p>
      </CardContent>
    </Card>
  );
}
