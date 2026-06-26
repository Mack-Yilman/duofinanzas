"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateFxRateAction } from "@/app/actions/settings";

/**
 * Formulario controlado para la tasa de cambio.
 *
 * Se usa un input CONTROLADO (value + onChange) a propósito: el valor proviene del
 * servidor (`couple.fxRate`) y la página se revalida tras guardar, lo que cambiaría el
 * `defaultValue` de un input no controlado y dispararía el warning de Base UI
 * ("changing the default value state of an uncontrolled FieldControl").
 */
export function FxRateForm({ initialRate }: { initialRate: number }) {
  const [rate, setRate] = React.useState(String(initialRate));

  // Si el servidor envía una tasa nueva tras revalidar, sincronizamos el valor controlado.
  React.useEffect(() => {
    setRate(String(initialRate));
  }, [initialRate]);

  return (
    <form action={updateFxRateAction} className="space-y-4 max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="fxRate">Tasa de Cambio (USD a PEN)</Label>
        <div className="flex gap-2">
          <Input
            id="fxRate"
            name="fxRate"
            type="number"
            step="0.001"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
          <Button type="submit">Actualizar</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Esta tasa se usará para el cálculo de tu liquidez cuando mezcles monedas.
        </p>
      </div>
    </form>
  );
}
