"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Logout por el CLIENTE usando el endpoint oficial de Auth.js (/api/auth/signout).
 * Es más fiable que un server action en Netlify: limpia la cookie de sesión de forma
 * consistente detrás del proxy/CDN, evitando que la sesión quede "pegada".
 */
export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="destructive"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await signOut({ callbackUrl: "/login", redirect: true });
      }}
    >
      {loading ? "Cerrando sesión..." : "Cerrar Sesión"}
    </Button>
  );
}
