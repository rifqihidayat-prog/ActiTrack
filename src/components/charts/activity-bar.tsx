"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

const typeLabels: Record<string, string> = {
  GRAND_OPENING: "Grand Opening", REGULER: "Reguler", POP_UP: "Pop Up",
  ROADSHOW: "Roadshow", INSTORE: "Instore", LAINNYA: "Lainnya",
};
const COLORS = ["#6366f1", "#22c55e", "#f59e0b"];

export default function ActivityBarChart({ data }: { data: { name: string; targetRev: number; actualSales: number; biaya: number; stores: any[] }[] }) {
  const router = useRouter();
  const chartData = data.map(d => ({ ...d, label: typeLabels[d.name] || d.name }));
  if (chartData.length === 0) return null;

  const handleClick = (entry: any) => {
    const found = data.find(d => d.name === entry.name);
    if (found) router.push(`/activity?type=${encodeURIComponent(found.name)}`);
  };

  return (
    <Card>
      <CardHeader><h3 className="text-sm font-semibold text-slate-900">Pencapaian per Aktivitas</h3></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barCategoryGap={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
            <Legend />
            <Bar dataKey="targetRev" name="Target" fill="#6366f1" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry: any) => handleClick(entry)} />
            <Bar dataKey="actualSales" name="Realisasi" fill="#22c55e" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry: any) => handleClick(entry)} />
            <Bar dataKey="biaya" name="Biaya" fill="#f59e0b" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry: any) => handleClick(entry)} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-400 mt-2 text-center">Klik bar untuk lihat daftar aktivitas</p>
      </CardContent>
    </Card>
  );
}
