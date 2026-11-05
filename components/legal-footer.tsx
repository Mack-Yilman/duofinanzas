import Link from "next/link";
import { cn } from "@/lib/utils";
import { LEGAL } from "@/lib/legal";

export function LegalFooter({ className }: { className?: string }) {
  return (
    <nav aria-label="Información legal" className={cn("flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      <Link href="/privacidad" className="hover:text-foreground hover:underline">Privacidad</Link>
      <Link href="/terminos" className="hover:text-foreground hover:underline">Términos</Link>
      <Link href="/cookies" className="hover:text-foreground hover:underline">Cookies</Link>
      <span title="Software propietario: todos los derechos reservados">© {LEGAL.copyrightYear} {LEGAL.owner.name}</span>
      {process.env.NEXT_PUBLIC_APP_VERSION && (
        <span title="Versión de la aplicación" className="tabular">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
      )}
    </nav>
  );
}
