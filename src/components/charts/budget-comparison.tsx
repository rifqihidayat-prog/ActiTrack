"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function BudgetComparisonChart({ data }: { data: { name: string; estimated: number; actual: number }[] }) {
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader><h3 className="text-sm font-semibold text-slate-900">Estimasi vs Realisasi Biaya</h3></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barCategoryGap={12}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
            <Legend />
            <Bar dataKey="estimated" name="Estimasi" fill="#6366f1" radius={[6, 6, 0, 0]} />
            <Bar dataKey="actual" name="Realisasi" fill="#22c55e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
