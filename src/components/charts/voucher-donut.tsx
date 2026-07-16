"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function VoucherDonutChart({ distributed, redeemed }: { distributed: number; redeemed: number }) {
  const router = useRouter();
  if (distributed === 0) return null;
  const data = [
    { name: "Tereedem", value: redeemed, color: "#6366f1" },
    { name: "Belum", value: Math.max(0, distributed - redeemed), color: "#cbd5e1" },
  ];

  return (
    <Card>
      <CardHeader><h3 className="text-sm font-semibold text-slate-900">Voucher Terpakai</h3></CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/voucher")}>
          <ResponsiveContainer width="60%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                {data.map((_, i) => <Cell key={i} fill={data[i].color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-slate-600">Tereedem: <strong>{redeemed}</strong></span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300" /><span className="text-slate-600">Belum: <strong>{Math.max(0, distributed - redeemed)}</strong></span></div>
            <p className="text-xs text-slate-400 mt-2">Total: {distributed} voucher</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">Klik untuk detail →</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
