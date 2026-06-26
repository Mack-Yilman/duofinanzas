import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // En un entorno de producción:
  // 1. Consultar a Notion por todos los RecurringExpenses activos (isActive = true).
  // 2. Filtrar los que su 'nextRun' sea hoy o en el pasado.
  // 3. Crear en la base de Expenses el gasto correspondiente.
  // 4. Actualizar 'nextRun' en RecurringExpenses sumando la frecuencia (1 mes, 1 semana, etc.).

  return NextResponse.json({ success: true, message: 'Cron job ejecutado exitosamente (placeholder)' });
}
