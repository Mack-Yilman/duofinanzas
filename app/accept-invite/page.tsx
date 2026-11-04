"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AuthShell } from "@/components/auth-shell";
import { supabase } from "@/lib/supabase/client";
import { acceptInvite } from "@/lib/actions/auth";
import { LEGAL } from "@/lib/legal";

/**
 * Destino del enlace de invitación. Supabase crea una sesión temporal desde la URL;
 * aquí la persona define su nombre y contraseña y acepta las políticas (Ley 29733).
 */
export default function AcceptInvitePage() {
  const [session, setSession] = useState<{ userId: string; name: string } | null | undefined>(undefined);
  const [error, setError] = useState<string>();
  const [consent, setConsent] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      setSession(u ? { userId: u.id, name: String(u.user_metadata?.name ?? "") } : null);
    };
    const { data } = supabase.auth.onAuthStateChange(() => load());
    load();
    return () => data.subscription.unsubscribe();
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const fd = new FormData(event.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password !== String(fd.get("confirm") ?? "")) return setError("Las contraseñas no coinciden.");
    setError(undefined);
    startTransition(async () => {
      const res = await acceptInvite({
        userId: session.userId,
        name: String(fd.get("name") ?? ""),
        password,
        consent,
        version: LEGAL.version,
      });
      setError(res.error);
    });
  }

  return (
    <AuthShell subtitle="Te invitaron a DúoFinanzas">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">
            <h1>Activa tu cuenta</h1>
          </CardTitle>
          <CardDescription>Elige cómo te llamaremos y una contraseña segura.</CardDescription>
        </CardHeader>
        {session === null ? (
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>El enlace de invitación no es válido o ya expiró. Pide al administrador que te reenvíe la invitación.</p>
            <Link href="/login" className="underline">Ir a iniciar sesión</Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tu nombre</Label>
                <Input id="name" name="name" defaultValue={session?.name} key={session?.name} maxLength={80} autoComplete="name" required disabled={isPending || !session} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required disabled={isPending || !session} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Repetir contraseña</Label>
                <Input id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required disabled={isPending || !session} />
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                />
                <span>
                  He leído y acepto la <Link href="/privacidad" target="_blank" className="underline">Política de Privacidad</Link> y
                  los <Link href="/terminos" target="_blank" className="underline">Términos de Uso</Link>, y consiento el
                  tratamiento de mis datos, incluido su almacenamiento en servidores fuera del Perú (Ley N.º 29733).
                </span>
              </label>
              {error && <p className="text-center text-sm text-destructive" role="alert">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isPending || !session || !consent}>
                {isPending ? "Activando…" : "Activar cuenta"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
