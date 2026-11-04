import Link from "next/link";
import { cn } from "@/lib/utils";

export function LegalFooter({ className }: { className?: string }) {
  return (
    <nav aria-label="Información legal" className={cn("flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      <Link href="/privacidad" className="hover:text-foreground hover:underline">Privacidad</Link>
      <Link href="/terminos" className="hover:text-foreground hover:underline">Términos</Link>
      <Link href="/cookies" className="hover:text-foreground hover:underline">Cookies</Link>
    </nav>
  );
}
