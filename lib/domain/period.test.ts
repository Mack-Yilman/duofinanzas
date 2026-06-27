import { describe, it, expect } from 'vitest';
import { getPeriodRange, isInPeriod } from './period';

describe('period logic (día de corte configurable)', () => {
  it('día de corte 15: si ya pasó el corte, el periodo empieza este mes', () => {
    // 20 de junio 2026 (monthIndex 5)
    const p = getPeriodRange(15, new Date(2026, 5, 20));
    expect(p.start.getFullYear()).toBe(2026);
    expect(p.start.getMonth()).toBe(5); // junio
    expect(p.start.getDate()).toBe(15);
    expect(p.end.getMonth()).toBe(6); // julio
    expect(p.end.getDate()).toBe(15);
  });

  it('día de corte 15: antes del corte, el periodo empezó el mes anterior', () => {
    const p = getPeriodRange(15, new Date(2026, 5, 10)); // 10 junio
    expect(p.start.getMonth()).toBe(4); // mayo
    expect(p.start.getDate()).toBe(15);
    expect(p.end.getMonth()).toBe(5); // junio
  });

  it('isInPeriod respeta los límites [start, end)', () => {
    const p = getPeriodRange(15, new Date(2026, 5, 20));
    expect(isInPeriod(new Date(2026, 5, 15), p)).toBe(true); // inicio inclusivo
    expect(isInPeriod(new Date(2026, 5, 30), p)).toBe(true);
    expect(isInPeriod(new Date(2026, 6, 15), p)).toBe(false); // fin exclusivo
    expect(isInPeriod(new Date(2026, 5, 14), p)).toBe(false);
  });

  it('día de corte 31 se ajusta al último día en meses cortos', () => {
    // Febrero 2026 (no bisiesto) tiene 28 días.
    const p = getPeriodRange(31, new Date(2026, 1, 15)); // 15 feb
    expect(p.start.getMonth()).toBe(0); // enero
    expect(p.start.getDate()).toBe(31);
    expect(p.end.getMonth()).toBe(1); // febrero
    expect(p.end.getDate()).toBe(28); // ajustado
  });

  it('offset negativo navega a periodos anteriores', () => {
    const p = getPeriodRange(1, new Date(2026, 5, 10), -1);
    expect(p.start.getMonth()).toBe(4); // mayo
    expect(p.end.getMonth()).toBe(5); // junio
  });
});
