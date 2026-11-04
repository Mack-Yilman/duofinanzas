"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RedirectIfAuthed } from "@/components/redirect-if-authed";
import { register } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setInfo(undefined);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await register(formData);
      setError(res.error);
      setInfo(res.info);
    });
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 bg-muted/40">
      <RedirectIfAuthed />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Ingresa tus datos para registrarte en DúoFinanzas.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" type="text" placeholder="Tu nombre" required disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" name="email" type="email" placeholder="correo@ejemplo.com" required disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" minLength={6} required disabled={isPending} />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            {info && <p className="text-sm text-emerald-600 text-center">{info}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creando cuenta..." : "Registrarse"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              ¿Ya tienes cuenta? <Link href="/login" className="underline">Inicia sesión</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
