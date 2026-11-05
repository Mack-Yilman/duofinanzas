"use client";

import { Expense, Category } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--brand-700)',
];

const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '0.75rem',
  color: 'var(--popover-foreground)',
  fontSize: '12px',
  boxShadow: '0 10px 30px -12px rgba(0,0,0,0.25)',
};

export interface EvolutionPoint { day: number; actual: number | null; anterior: number | null }

export function DashboardCharts({ expenses, categories, evolution }: { expenses: Expense[], categories: Category[], evolution: EvolutionPoint[] }) {
  // Aggregate expenses by category
  const categoryTotals: Record<string, number> = {};
  
  expenses.forEach(exp => {
    if (!categoryTotals[exp.categoryId]) {
      categoryTotals[exp.categoryId] = 0;
    }
    // We simplify by adding base amounts
    categoryTotals[exp.categoryId] += exp.amountBase;
  });

  const pieData = Object.keys(categoryTotals).map(catId => {
    const cat = categories.find(c => c.id === catId);
    return {
      name: cat ? `${cat.icon} ${cat.name}` : "Sin Categoría",
      value: categoryTotals[catId]
    };
  }).filter(d => d.value > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Gastos por Categoría (Base)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => `S/ ${Number(value).toFixed(2)}`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No hay datos para graficar.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Gasto acumulado vs. periodo anterior</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {evolution.some((p) => (p.actual ?? 0) > 0 || (p.anterior ?? 0) > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" tickFormatter={(d) => `Día ${d}`} minTickGap={24} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" tickFormatter={(value) => `S/${value}`} width={56} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => `Día ${d}`} formatter={(value) => `S/ ${Number(value).toFixed(2)}`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="anterior" name="Periodo anterior" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="actual" name="Este periodo" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No hay datos para graficar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
