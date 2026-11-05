"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/domain/money";

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--popover-foreground)",
  fontSize: "12px",
};

/** Barras apiladas por mes: compartido vs. personal (PEN). */
export function AnnualChart({ months }: { months: { label: string; shared: number; personal: number }[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Gastos por mes del año">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} stroke="var(--muted-foreground)" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMoney(Number(v), "PEN")} cursor={{ fill: "var(--muted)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="shared" name="Compartido" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="personal" name="Personal" stackId="a" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
