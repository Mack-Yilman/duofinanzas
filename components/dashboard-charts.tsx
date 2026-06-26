"use client";

import { Expense, Category } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

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

export function DashboardCharts({ expenses, categories }: { expenses: Expense[], categories: Category[] }) {
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

  // Group by date for bar chart (last 7 days or similar)
  // Let's do a simple grouping by Day
  const dailyTotals: Record<string, number> = {};
  expenses.forEach(exp => {
    const dayStr = exp.date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    if (!dailyTotals[dayStr]) {
      dailyTotals[dayStr] = 0;
    }
    dailyTotals[dayStr] += exp.amountBase;
  });

  const barData = Object.keys(dailyTotals).map(day => ({
    name: day,
    total: dailyTotals[day]
  })).reverse(); // Assuming it's already sorted DESC, we reverse for chronological order

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
                <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => `S/ ${Number(value).toFixed(2)}`} />
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
          <CardTitle className="text-sm font-medium text-muted-foreground">Evolución de Gastos (Base)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" tickFormatter={(value) => `S/${value}`} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'color-mix(in oklch, var(--primary) 8%, transparent)' }} formatter={(value: any) => `S/ ${Number(value).toFixed(2)}`} />
                <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
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
