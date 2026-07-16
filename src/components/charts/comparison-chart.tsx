"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

const COLORS = ["#94a3b8", "#6366f1"];

interface Props {
  totalLastSales: number;
  totalSales: number;
  totalLastTx: number;
  totalTx: number;
}

export default function ComparisonChart({ totalLastSales, totalSales, totalLastTx, totalTx }: Props) {
  const router = useRouter();
  const salesData = [
    { name: "Bulan Lalu", value: totalLastSales },
    { name: "Realisasi", value: totalSales },
  ];
  const txData = [
    { name: "Bulan Lalu", value: totalLastTx },
    { name: "Realisasi", value: totalTx },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <Card className="cursor-pointer" onClick={() => router.push("/comparison?type=sales")}>
        <CardHeader>
          <p className="text-sm font-semibold text-slate-700">Sales: Bulan Lalu vs Realisasi</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesData} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={v => `${(v / 1e6).toFixed(0)}jt`} />
              <Tooltip formatter={(val: number) => formatCurrency(val)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {salesData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="cursor-pointer" onClick={() => router.push("/comparison?type=transactions")}>
        <CardHeader>
          <p className="text-sm font-semibold text-slate-700">Transaksi: Bulan Lalu vs Realisasi</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={txData} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip formatter={(val: number) => val.toLocaleString("id-ID")} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {txData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
