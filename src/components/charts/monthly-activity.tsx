"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const monthNames = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export default function MonthlyActivityChart({ data }: { data: { month: string; count: number; approved: number; withResult: number }[] }) {
  const router = useRouter();
  const chartData = data.map(d => ({ ...d, label: monthNames[parseInt(d.month.substring(5, 7)) - 1] || d.month }));
  if (chartData.length === 0) return null;

  const handleClick = (entry: any) => {
    if (entry?.month) {
      const startDate = entry.month + "-01";
      const endDate = new Date(entry.month + "-01");
      endDate.setMonth(endDate.getMonth() + 1, 0);
      router.push(`/activity?startDate=${startDate}&endDate=${endDate.toISOString().substring(0, 10)}`);
    }
  };

  return (
    <Card>
      <CardHeader><h3 className="text-sm font-semibold text-slate-900">Aktivitas Selesai per Bulan</h3></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} barCategoryGap={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
            <Bar dataKey="withResult" name="Selesai" fill="#06b6d4" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry: any) => handleClick(entry)} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-400 mt-2 text-center">Klik bar untuk lihat aktivitas bulan tersebut</p>
      </CardContent>
    </Card>
  );
}
