"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMe } from "@/components/auth-provider";
import { acceptTerms, logout } from "@/lib/actions/auth";
import { LEGAL } from "@/lib/legal";

/**
 * Si el usuario no aceptó la versión vigente de las políticas (cuenta previa o
 * política actualizada), se le pide antes de continuar. Consentimiento expreso.
 */
export function ConsentGate() {
  const { data: me } = useMe();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  // No bloquear la lectura de las políticas ni la activación de la cuenta.
  const exempt = /^\/(privacidad|terminos|cookies|accept-invite|reset-password|login)/.test(pathname);
  if (!me || exempt || me.consentVersion === LEGAL.version) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="consent-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-popover p-6 text-popover-foreground shadow-xl">
        <h2 id="consent-title" className="text-xl font-semibold">Actualizamos nuestras políticas</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Para seguir usando {LEGAL.appName} necesitamos tu consentimiento conforme a la Ley N.º 29733.
        </p>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
          <span>
            Acepto la <Link href="/privacidad" target="_blank" className="underline">Política de Privacidad</Link> y los{" "}
            <Link href="/terminos" target="_blank" className="underline">Términos de Uso</Link>, incluido el almacenamiento de mis
            datos fuera del Perú.
          </span>
        </label>
        {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => logout()} disabled={pending}>Salir</Button>
          <Button
            disabled={!checked || pending}
            onClick={() => start(async () => setError((await acceptTerms(LEGAL.version)).error))}
          >
            {pending ? "Guardando…" : "Aceptar y continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
