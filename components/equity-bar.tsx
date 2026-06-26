"use client";

import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/domain/money";

interface EquityBarProps {
  shareA: number; // 0 to 1
  shareB: number; // 0 to 1
  incomeA: number;
  incomeB: number;
  nameA: string;
  nameB: string;
}

export function EquityBar({ shareA, shareB, incomeA, incomeB, nameA, nameB }: EquityBarProps) {
  const percentA = Math.round(shareA * 100);
  const percentB = Math.round(shareB * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-user-a ring-2 ring-user-a/20" />
          <span className="truncate">{nameA}</span>
          <span className="tabular text-muted-foreground">{percentA}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular text-muted-foreground">{percentB}%</span>
          <span className="truncate">{nameB}</span>
          <span className="h-2.5 w-2.5 rounded-full bg-user-b ring-2 ring-user-b/20" />
        </div>
      </div>

      {/* Barra de equidad a dos tonos con marcador central */}
      <div className="relative flex h-5 w-full overflow-hidden rounded-full bg-user-b shadow-inner ring-1 ring-black/5">
        <div
          className="h-full bg-user-a transition-all duration-700 ease-out"
          style={{ width: `${percentA}%` }}
        />
        <div
          className="absolute top-1/2 h-full w-0.5 -translate-x-1/2 -translate-y-1/2 bg-card/80 transition-all duration-700 ease-out"
          style={{ left: `${percentA}%` }}
          aria-hidden
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <div className="tabular">{formatMoney(incomeA, "PEN")}</div>
        <div className="tabular">{formatMoney(incomeB, "PEN")}</div>
      </div>
    </div>
  );
}
