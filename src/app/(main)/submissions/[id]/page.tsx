import { getSubmissionById } from "@/lib/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, BarChart3, Target, TrendingUp, ShoppingCart } from "lucide-react";

const objLabels: Record<string, string> = { REVENUE: "Pendapatan", TRAFFIC: "Kunjungan" };

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sub = await getSubmissionById(Number(id));
  if (!sub) notFound();

  const totalBudget = sub.budgets?.reduce((s, b) => s + b.estimatedCost, 0) ?? 0;
  const totalActualCostItems = sub.eventResult?.costItems?.reduce((s, c) => s + c.actualCost, 0) ?? 0;
  const actualTotalCost = sub.eventResult?.actualTotalCost ?? 0;
  const badgeColor = { Pending: "amber" as const, Approved: "emerald" as const, Rejected: "rose" as const }[sub.approvalStatus] || "slate";

  const targetRev = sub.managerTarget || sub.targetValue || 0;
  const targetTx = sub.targetTransactions || 0;
  const hasResult = !!sub.eventResult;
  const revPct = targetRev > 0 && hasResult ? ((sub.eventResult!.actualSales / targetRev) * 100) : null;
  const txPct = targetTx > 0 && hasResult ? ((sub.eventResult!.transactionCount / targetTx) * 100) : null;
  const bepReached = hasResult ? sub.eventResult!.actualSales >= actualTotalCost : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft size={16} /> Kembali
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sub.storeName}</h1>
          <p className="text-sm text-slate-500 mt-1">{sub.activationType.replace(/_/g, " ")} — {formatDate(sub.proposedDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={badgeColor}>{sub.approvalStatus}</Badge>
          {sub.approvalStatus === "Approved" && (
            <Link href={`/submissions/${sub.id}/result`}>
              <Button size="sm"><BarChart3 size={14} /> {hasResult ? "Edit Hasil Event" : "Input Hasil Event"}</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Objective & Target Card */}
      {sub.objectiveType && (
        <div className="ga-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ background: "var(--ga-blue-bg)", color: "var(--ga-blue)" }}>
              <Target size={18} />
            </div>
            <span className="text-sm font-semibold text-slate-900">{objLabels[sub.objectiveType]}</span>
            {sub.objectiveType === "TRAFFIC" && sub.managerTarget > 0 && (
              <span className="text-xs text-slate-500">Target Pengunjung: {sub.managerTarget.toLocaleString("id-ID")} orang</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-500 flex items-center gap-1"><TrendingUp size={14} /> Target Revenue</span>
                <span className="font-semibold text-slate-900">{formatCurrency(targetRev)}</span>
              </div>
              {hasResult && (
                <div>
                  <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(revPct || 0, 100)}%`, background: (revPct || 0) >= 100 ? "var(--ga-green)" : "var(--ga-blue)" }} />
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: (revPct || 0) >= 100 ? "var(--ga-green)" : "var(--ga-text-muted)" }}>
                    Realisasi: {formatCurrency(sub.eventResult!.actualSales)} ({revPct?.toFixed(0)}%)
                  </p>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-500 flex items-center gap-1"><ShoppingCart size={14} /> Target Transaksi</span>
                <span className="font-semibold text-slate-900">{targetTx.toLocaleString("id-ID")}</span>
              </div>
              {hasResult && (
                <div>
                  <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(txPct || 0, 100)}%`, background: (txPct || 0) >= 100 ? "var(--ga-green)" : "var(--ga-blue)" }} />
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: (txPct || 0) >= 100 ? "var(--ga-green)" : "var(--ga-text-muted)" }}>
                    Realisasi: {sub.eventResult!.transactionCount.toLocaleString("id-ID")} ({txPct?.toFixed(0)}%)
                  </p>
                </div>
              )}
            </div>
          </div>
          {hasResult && bepReached !== null && (
            <div className="mt-3 text-xs font-semibold" style={{ color: bepReached ? "var(--ga-green)" : "var(--ga-red)" }}>
              {bepReached ? "✓ Tercapai" : "✗ Belum Tercapai (Biaya: " + formatCurrency(actualTotalCost) + ")"}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-slate-900">Informasi Acara</h3></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500">PIC</p><p className="font-medium">{sub.picName}</p></div>
              <div><p className="text-slate-500">Tanggal</p><p className="font-medium">{formatDate(sub.proposedDate)}</p></div>
              <div><p className="text-slate-500">Jenis</p><p className="font-medium">{sub.activationType.replace(/_/g, " ")}</p></div>
              {sub.approvedBy && <div><p className="text-slate-500">Disetujui</p><p className="font-medium">{sub.approvedBy}</p></div>}
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
              <div><p className="text-xs text-slate-500">Sales Bulan Lalu</p><p className="text-sm font-semibold text-slate-900">{formatCurrency(sub.lastMonthSales)}</p></div>
              <div><p className="text-xs text-slate-500">Transaksi Bulan Lalu</p><p className="text-sm font-semibold text-slate-900">{sub.lastMonthTransactions?.toLocaleString("id-ID") || "-"}</p></div>
            </div>
            {sub.descriptionTarget && <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 mb-1">Deskripsi</p><p className="text-sm text-slate-700">{sub.descriptionTarget}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-slate-900">Rincian Biaya</h3></CardHeader>
          <CardContent>
            {sub.budgets?.length ? (
              <div className="space-y-2">
                {sub.budgets.map(b => (
                  <div key={b.id} className="flex justify-between text-sm p-2.5 bg-slate-50 rounded-xl">
                    <div><p className="font-medium text-slate-900">{b.itemDescription}</p><p className="text-xs text-slate-400">{b.budgetCategory}</p></div>
                    <p className="font-semibold text-slate-900">{formatCurrency(b.estimatedCost)}</p>
                  </div>
                ))}
                <div className="flex justify-between p-2.5 bg-indigo-50 rounded-xl text-sm font-bold text-indigo-800">
                  <span>Total Estimasi</span><span>{formatCurrency(totalBudget)}</span>
                </div>
              </div>
            ) : <p className="text-sm text-slate-400">Belum ada rincian biaya</p>}
          </CardContent>
        </Card>
      </div>

      {hasResult && (
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-slate-900">Hasil Event</h3></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Sales</p><p className="text-lg font-bold text-slate-900">{formatCurrency(sub.eventResult!.actualSales)}</p></div>
              <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Biaya Riil</p><p className="text-lg font-bold text-slate-900">{formatCurrency(actualTotalCost)}</p></div>
              <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Transaksi</p><p className="text-lg font-bold text-slate-900">{sub.eventResult!.transactionCount}</p></div>
              <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500">Voucher</p><p className="text-lg font-bold text-slate-900">{sub.eventResult!.vouchersDistributed} / {sub.eventResult!.vouchersRedeemed}</p></div>
            </div>
            {sub.eventResult!.costItems?.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Rincian Biaya Riil</p>
                <div className="space-y-1.5">
                  {sub.eventResult!.costItems.map((c, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <div><span className="text-slate-700">{c.itemDescription}</span> <span className="text-xs text-slate-400">({c.budgetCategory})</span></div>
                      <span className="font-medium text-slate-900">{formatCurrency(c.actualCost)}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-1.5 mt-1.5 flex justify-between text-sm font-bold text-slate-900">
                    <span>Total</span><span>{formatCurrency(actualTotalCost)}</span>
                  </div>
                </div>
              </div>
            )}
            {sub.eventResult!.dealposRef && <p className="text-xs text-slate-400 mt-2">Ref: {sub.eventResult!.dealposRef}</p>}
            {sub.eventResult!.notes && <div className="mt-4 p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 mb-1">Catatan Evaluasi</p><p className="text-sm text-slate-700">{sub.eventResult!.notes}</p></div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
