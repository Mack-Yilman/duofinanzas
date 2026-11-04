import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Cookies y almacenamiento · DúoFinanzas" };

const ITEMS = [
  ["sb-…-auth-token", "Almacenamiento local", "Mantener tu sesión iniciada de forma segura (Supabase Auth).", "Hasta cerrar sesión"],
  ["theme", "Almacenamiento local", "Recordar tu preferencia de tema claro u oscuro.", "Persistente"],
  ["duo-storage-notice-v1", "Almacenamiento local", "Recordar que ya viste el aviso de almacenamiento.", "Persistente"],
];

export default function CookiesPage() {
  return (
    <LegalPage title="Política de Cookies y Almacenamiento">
      <p>
        DúoFinanzas <strong>no usa cookies de publicidad, analítica ni de terceros</strong>. Solo guarda en tu
        navegador la información <strong>estrictamente necesaria</strong> para funcionar, por lo que no requiere un
        consentimiento adicional. Las fuentes tipográficas se sirven desde nuestro propio sitio, sin contactar a
        servicios externos.
      </p>

      <h2>Elementos que almacenamos</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Finalidad</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map(([name, type, purpose, duration]) => (
              <tr key={name}>
                <td><code>{name}</code></td>
                <td>{type}</td>
                <td>{purpose}</td>
                <td>{duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Cómo eliminarlos</h2>
      <p>
        Al cerrar sesión se borra la sesión. También puedes borrar los datos del sitio desde la configuración de tu
        navegador; si lo haces, tendrás que iniciar sesión de nuevo.
      </p>
    </LegalPage>
  );
}
