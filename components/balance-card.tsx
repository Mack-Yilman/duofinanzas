"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/domain/money";

interface BalanceCardProps {
  balance: number; // Positive = current user owes money. Negative = current user is owed money.
  currentUserName: string;
  partnerName: string;
}

export function BalanceCard({ balance, currentUserName, partnerName }: BalanceCardProps) {
  const isSettled = balance === 0;
  const iOwe = balance > 0;
  const amount = Math.abs(balance);

  let title = "Están a mano";
  let description = "No hay deudas pendientes en este ciclo.";
  let colorClass = "text-muted-foreground";

  if (!isSettled) {
    if (iOwe) {
      title = `Debes a ${partnerName}`;
      description = "Tienes un saldo pendiente por pagar.";
      colorClass = "text-destructive";
    } else {
      title = `${partnerName} te debe`;
      description = "Tienes un saldo a tu favor.";
      colorClass = "text-brand-600";
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Estado de Cuentas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-2xl font-bold ${colorClass}`}>
              {isSettled ? "S/ 0.00" : formatMoney(amount, "PEN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{title}</p>
          </div>
          {!isSettled && (
            <div className="text-right text-xs text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
