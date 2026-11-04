import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Términos de Uso · DúoFinanzas" };

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y Condiciones de Uso">
      <h2>1. Objeto</h2>
      <p>
        {LEGAL.appName} es una herramienta gratuita y privada para que parejas registren y organicen sus finanzas
        compartidas. Al activar tu cuenta aceptas estos términos y la <Link href="/privacidad">Política de Privacidad</Link>.
      </p>

      <h2>2. Acceso por invitación</h2>
      <ul>
        <li>Las cuentas solo se crean por invitación del administrador; no existe registro público.</li>
        <li>Debes ser mayor de 18 años y usar datos veraces.</li>
        <li>Eres responsable de la confidencialidad de tu contraseña. Avísanos si sospechas un uso no autorizado.</li>
      </ul>

      <h2>3. Uso aceptable</h2>
      <ul>
        <li>Usa la app solo para fines personales y lícitos.</li>
        <li>Sube únicamente constancias propias o sobre las que tengas derecho; no incluyas datos de terceros innecesarios.</li>
        <li>Está prohibido intentar acceder a datos de otras parejas, vulnerar la seguridad o automatizar abusos.</li>
      </ul>

      <h2>4. Naturaleza del servicio</h2>
      <p>
        Los cálculos (proporciones, saldos, liquidez, tipo de cambio) son referenciales y dependen de los datos que
        registres. {LEGAL.appName} <strong>no es una entidad financiera ni brinda asesoría financiera, contable o
        tributaria</strong>, y no realiza pagos ni transferencias.
      </p>

      <h2>5. Disponibilidad y responsabilidad</h2>
      <p>
        El servicio se ofrece “tal cual”, sin garantía de disponibilidad ininterrumpida. En la medida permitida por la
        ley, el titular no responde por decisiones tomadas con base en los cálculos de la app ni por interrupciones de
        los proveedores de infraestructura. Te recomendamos descargar tus datos periódicamente.
      </p>

      <h2>6. Suspensión y baja</h2>
      <p>
        El administrador puede suspender o eliminar cuentas que incumplan estos términos. Puedes dar de baja tu cuenta
        en cualquier momento desde Ajustes → Mis datos.
      </p>

      <h2>7. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República del Perú. Cualquier controversia se someterá a los
        jueces y tribunales del Perú, sin perjuicio de los derechos que la ley te reconozca como usuario.
      </p>

      <h2>8. Contacto</h2>
      <p>
        <a href={`mailto:${LEGAL.owner.email}`}>{LEGAL.owner.email}</a>
      </p>
    </LegalPage>
  );
}
