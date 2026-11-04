"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

/** Cierra la sesión de Supabase y limpia toda la caché de datos del navegador. */
export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="destructive"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await logout();
      }}
    >
      {loading ? "Cerrando sesión..." : "Cerrar Sesión"}
    </Button>
  );
}
