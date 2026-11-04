import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de Privacidad · DúoFinanzas" };

export default function PrivacidadPage() {
  const o = LEGAL.owner;
  return (
    <LegalPage title="Política de Privacidad">
      <p>
        En {LEGAL.appName} tratamos tus datos personales conforme a la <strong>Ley N.º 29733, Ley de Protección de
        Datos Personales</strong>, y su Reglamento aprobado por <strong>Decreto Supremo N.º 016-2024-JUS</strong>.
        Esta política explica qué datos recopilamos, para qué, con quién se comparten y cómo ejercer tus derechos.
      </p>

      <h2>1. Titular del banco de datos</h2>
      <ul>
        <li>Titular: {o.name} (persona natural).</li>
        <li>Domicilio: {o.address}.</li>
        <li>Contacto para privacidad y derechos ARCO: <a href={`mailto:${o.email}`}>{o.email}</a>.</li>
      </ul>
      <p>
        El banco de datos de usuarios de {LEGAL.appName} se encuentra en proceso de inscripción ante el Registro
        Nacional de Protección de Datos Personales de la Autoridad Nacional de Protección de Datos Personales (ANPD).
      </p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li><strong>Identificación y cuenta:</strong> nombre, correo electrónico, contraseña (almacenada cifrada, nunca en texto plano), fechas de alta y de último acceso.</li>
        <li><strong>Datos financieros que tú registras:</strong> ingresos, gastos, categorías, metas de ahorro, aportes y tipo de cambio.</li>
        <li><strong>Imágenes de constancias</strong> (opcionales) que adjuntes como prueba de un pago. Antes de subirlas, la app elimina los metadatos de ubicación (EXIF/GPS) cuando el formato lo permite.</li>
        <li><strong>Datos técnicos mínimos</strong> necesarios para la seguridad: registros de acceso del proveedor de infraestructura.</li>
      </ul>
      <p>No tratamos datos sensibles con fines distintos al servicio, ni elaboramos perfiles comerciales.</p>

      <h2>3. Finalidades</h2>
      <ul>
        <li>Prestar el servicio: calcular proporciones de gasto, saldos entre la pareja, liquidez y metas.</li>
        <li>Gestionar tu cuenta, el acceso por invitación y la seguridad (prevención de accesos no autorizados).</li>
        <li>Atender tus solicitudes y el ejercicio de tus derechos.</li>
      </ul>
      <p>No usamos tus datos para publicidad, ni los vendemos o cedemos a terceros con fines comerciales.</p>

      <h2>4. Base de legitimación y consentimiento</h2>
      <p>
        Tratamos tus datos sobre la base de tu <strong>consentimiento previo, libre, expreso, informado e
        inequívoco</strong>, que otorgas al aceptar esta política al activar tu cuenta. Registramos la versión aceptada
        y la fecha. Puedes <strong>revocar tu consentimiento</strong> en cualquier momento eliminando tu cuenta
        (Ajustes → Mis datos) o escribiéndonos; la revocación no tiene efectos retroactivos.
      </p>

      <h2>5. Con quién se comparten</h2>
      <ul>
        <li><strong>Tu pareja dentro de la app:</strong> los datos financieros compartidos y las constancias son visibles para el otro miembro de tu pareja. Los gastos personales solo los ves tú.</li>
        <li><strong>Administrador de la plataforma:</strong> puede ver tu nombre, correo, pareja y fechas de acceso para gestionar cuentas. No accede a tus datos financieros desde la aplicación.</li>
        <li><strong>Encargados del tratamiento</strong> (proveedores de infraestructura): {LEGAL.hosting.database}; {LEGAL.hosting.web}.</li>
      </ul>

      <h2>6. Transferencia internacional (flujo transfronterizo)</h2>
      <p>
        Tus datos se almacenan en servidores de Supabase ubicados en <strong>Estados Unidos</strong> y la aplicación
        web se sirve desde GitHub Pages (Estados Unidos). Estos proveedores aplican medidas de seguridad como cifrado
        en tránsito (TLS) y en reposo. Al aceptar esta política consientes este flujo transfronterizo, necesario para
        prestar el servicio.
      </p>

      <h2>7. Plazo de conservación</h2>
      <p>
        Conservamos tus datos mientras tu cuenta esté activa. Al eliminar tu cuenta se borran tu perfil, tus ingresos y
        tus aportes; los registros compartidos de la pareja se eliminan cuando la pareja se queda sin miembros. Las
        copias de seguridad del proveedor pueden conservar información hasta por 30 días antes de su borrado definitivo.
        El registro de auditoría de acciones administrativas se conserva por razones de seguridad.
      </p>

      <h2>8. Medidas de seguridad</h2>
      <ul>
        <li>Acceso solo por invitación del administrador y contraseñas de al menos 8 caracteres.</li>
        <li>Aislamiento por pareja en la base de datos (Row Level Security): nadie puede leer datos de otra pareja.</li>
        <li>Constancias en almacenamiento privado, accesibles solo con enlaces temporales de 5 minutos.</li>
        <li>Cifrado TLS en todas las comunicaciones y registro de auditoría de acciones administrativas.</li>
      </ul>

      <h2>9. Tus derechos (ARCO) y cómo ejercerlos</h2>
      <p>Como titular de los datos puedes ejercer en cualquier momento los derechos de:</p>
      <ul>
        <li><strong>Acceso</strong>: descarga tus datos en Ajustes → Mis datos → “Descargar mis datos”.</li>
        <li><strong>Rectificación</strong>: edita tu nombre y tus registros desde la app, o solicítalo por correo.</li>
        <li><strong>Cancelación</strong> (supresión): elimina tu cuenta en Ajustes → Mis datos.</li>
        <li><strong>Oposición</strong> y revocación del consentimiento: escríbenos a <a href={`mailto:${o.email}`}>{o.email}</a>.</li>
      </ul>
      <p>
        Responderemos dentro de los plazos de la normativa vigente (como referencia, un máximo de {LEGAL.responseDays}
        días hábiles). Si consideras que tu solicitud no fue atendida, puedes presentar una reclamación ante la
        <strong> Autoridad Nacional de Protección de Datos Personales (ANPD)</strong> del Ministerio de Justicia y
        Derechos Humanos.
      </p>

      <h2>10. Menores de edad</h2>
      <p>El servicio está dirigido a mayores de 18 años. No tratamos conscientemente datos de menores.</p>

      <h2>11. Cambios a esta política</h2>
      <p>
        Si modificamos esta política actualizaremos su versión y te pediremos aceptarla nuevamente al ingresar.
      </p>
    </LegalPage>
  );
}
