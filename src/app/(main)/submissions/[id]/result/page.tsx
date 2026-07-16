import { getSubmissionById } from "@/lib/actions";
import { notFound } from "next/navigation";
import EventResultForm from "@/components/form/event-result-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const objLabels: Record<string, string> = { REVENUE: "Pendapatan", TRAFFIC: "Kunjungan" };

export default async function EventResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sub = await getSubmissionById(Number(id));
  if (!sub) notFound();
  if (sub.approvalStatus !== "Approved") return <div className="text-center py-20 text-slate-500">Hanya event yang sudah Approved yang bisa diisi hasilnya.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={`/submissions/${sub.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Kembali ke detail
      </Link>
      <div><h1 className="text-2xl font-bold text-slate-900">{sub.eventResult ? "Edit" : "Input"} Hasil Event</h1><p className="text-sm text-slate-500 mt-1">{sub.storeName} — {sub.activationType.replace(/_/g, " ")}</p></div>

      {/* Target info card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Target Aktivasi</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500">Tujuan</p>
            <p className="text-sm font-semibold text-slate-900">{objLabels[sub.objectiveType]}</p>
            {sub.objectiveType === "TRAFFIC" && sub.managerTarget > 0 && (
              <p className="text-xs text-slate-500 mt-1">Target Pengunjung: {sub.managerTarget.toLocaleString("id-ID")} orang</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Target Revenue</p>
            <p className="text-sm font-semibold text-indigo-700">{formatCurrency(sub.managerTarget || sub.targetValue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Target Transaksi</p>
            <p className="text-sm font-semibold text-indigo-700">{sub.targetTransactions?.toLocaleString("id-ID") || "-"}</p>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Estimasi Biaya: {formatCurrency(sub.budgets?.reduce((s, b) => s + b.estimatedCost, 0) ?? 0)}
          {' — '}Sales Bulan Lalu: {formatCurrency(sub.lastMonthSales)}
        </div>
      </div>

      <EventResultForm submissionId={sub.id} initial={sub.eventResult} submission={sub} />
    </div>
  );
}
