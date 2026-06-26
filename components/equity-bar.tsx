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
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <div>
          <span className="text-user-a mr-2">●</span>
          {nameA} ({percentA}%)
        </div>
        <div>
          {nameB} ({percentB}%)
          <span className="text-user-b ml-2">●</span>
        </div>
      </div>
      
      {/* Custom Progress Bar with two colors */}
      <div className="h-4 w-full bg-user-b rounded-full overflow-hidden flex">
        <div 
          className="h-full bg-user-a transition-all duration-500 ease-in-out" 
          style={{ width: `${percentA}%` }} 
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <div>{formatMoney(incomeA, "PEN")}</div>
        <div>{formatMoney(incomeB, "PEN")}</div>
      </div>
    </div>
  );
}
