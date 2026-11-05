"use client";

import { useEffect, useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { disableMfa, startEnroll, verifiedTotp, verifyCode } from "@/lib/mfa";

type Enroll = { factorId: string; qr: string; secret: string };

/** Activar o desactivar la verificación en dos pasos (TOTP). */
export function MfaCard() {
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined);
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [pending, start] = useTransition();

  async function refresh() {
    try {
      const [f] = await verifiedTotp();
      setFactorId(f?.id ?? null);
    } catch {
      setFactorId(null);
    }
  }
  useEffect(() => {
    let alive = true;
    verifiedTotp()
      .then(([f]) => alive && setFactorId(f?.id ?? null))
      .catch(() => alive && setFactorId(null));
    return () => {
      alive = false;
    };
  }, []);

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ocurrió un error");
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden /> Verificación en dos pasos
        </CardTitle>
        <CardDescription>
          Además de la contraseña, pide un código de tu app autenticadora (Google Authenticator, Microsoft
          Authenticator, 1Password…). Muy recomendada para administradores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {factorId === undefined && <p className="text-sm text-muted-foreground">Comprobando…</p>}

        {factorId && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">✅ Activada</p>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  if (!confirm("¿Desactivar la verificación en dos pasos?")) return;
                  await disableMfa(factorId);
                  toast.success("Verificación en dos pasos desactivada");
                  await refresh();
                })
              }
            >
              Desactivar
            </Button>
          </div>
        )}

        {factorId === null && !enroll && (
          <Button disabled={pending} onClick={() => run(async () => setEnroll(await startEnroll()))}>
            Activar
          </Button>
        )}

        {factorId === null && enroll && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code") ?? "");
              run(async () => {
                await verifyCode(enroll.factorId, code);
                setEnroll(null);
                toast.success("Verificación en dos pasos activada");
                await refresh();
              });
            }}
          >
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Escanea el código QR con tu app autenticadora.</li>
              <li>Escribe el código de 6 dígitos que muestra la app.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="Código QR para la app autenticadora" className="h-44 w-44 rounded-lg bg-white p-2" />
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">¿No puedes escanear? Clave manual</summary>
              <code className="mt-1 block break-all select-all">{enroll.secret}</code>
            </details>
            <div className="flex max-w-xs items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="mfa-code">Código</Label>
                <Input id="mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required />
              </div>
              <Button type="submit" disabled={pending}>Verificar</Button>
            </div>
            <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setEnroll(null)}>
              Cancelar
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
