"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { updateApprovalStatus, updateSubmissionTarget, deleteSubmission } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import NumberInput from "@/components/ui/number-input";
import { unformat } from "@/components/ui/number-input";
import { Check, X, Eye, Filter, Target, Trash2, TrendingUp } from "lucide-react";

const objLabels: Record<string, string> = { REVENUE: "Pendapatan", TRAFFIC: "Kunjungan" };

export default function ApprovalKanban({ submissions }: { submissions: any[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const [adjRevenue, setAdjRevenue] = useState("");
  const [adjTransactions, setAdjTransactions] = useState("");

  const filtered = filter === "ALL" ? submissions : submissions.filter((s: any) => s.approvalStatus === filter);

  const handleAction = async (id: number, status: string) => {
    setLoading(id);
    await updateApprovalStatus(id, status, { approvedBy: "Super Admin" });
    setLoading(null);
    setSelected(null);
    router.refresh();
  };

  const handleApproveWithTargets = async () => {
    if (!selected) return;
    const rev = adjRevenue !== "" ? unformat(adjRevenue) : selected.targetValue;
    const tx = adjTransactions !== "" ? unformat(adjTransactions) : selected.targetTransactions;
    setLoading(selected.id);
    await updateSubmissionTarget(selected.id, {
      targetValue: rev,
      targetTransactions: tx,
      managerTarget: selected.objectiveType === "TRAFFIC" ? rev : undefined,
    });
    await updateApprovalStatus(selected.id, "Approved", { approvedBy: "Super Admin" });
    setLoading(null);
    setSelected(null);
    router.refresh();
  };

  const sb = (s: string) => {
    const m: Record<string, {label:string;color:string}> = {Pending:{label:"Pending",color:"amber"},Approved:{label:"Approved",color:"emerald"},Rejected:{label:"Rejected",color:"rose"}};
    const r = m[s] || {label:s,color:"slate"}; return <Badge color={r.color}>{r.label}</Badge>;
  };

  return <div>
    <div className="flex items-center gap-2 mb-6">
      <Filter size={16} className="text-slate-400" />
      {["ALL","Pending","Approved","Rejected"].map(f => (
        <button key={f} onClick={() => setFilter(f)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter===f?"bg-indigo-600 text-white shadow-sm":"bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
          {f==="ALL"?"Semua":f}
        </button>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {["Outlet","PIC","Tujuan","Jenis","Estimasi","Status","Aksi"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s: any) => {
              const tb = s.budgets?.reduce((a:number,b:any)=>a+b.estimatedCost,0)??0;
              return <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3.5 text-sm font-medium text-slate-900">{s.storeName}</td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{s.picName}</td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{formatDate(s.proposedDate)}</td>
                <td className="px-4 py-3.5 text-sm text-slate-600">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{objLabels[s.objectiveType] || s.objectiveType}</span>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{s.activationType.replace(/_/g," ")}</td>
                <td className="px-4 py-3.5 text-sm font-medium text-slate-900">{formatCurrency(tb)}</td>
                <td className="px-4 py-3.5">{sb(s.approvalStatus)}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {s.approvalStatus==="Pending" && <>
                      <button onClick={()=>handleAction(s.id,"Approved")} disabled={loading===s.id}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"><Check size={16}/></button>
                      <button onClick={()=>handleAction(s.id,"Rejected")} disabled={loading===s.id}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"><X size={16}/></button>
                    </>}
                    <button onClick={()=>{setSelected(s); setAdjRevenue(Number(s.targetValue).toLocaleString("id-ID")); setAdjTransactions(Number(s.targetTransactions).toLocaleString("id-ID"));}}
                      className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"><Eye size={16}/></button>
                    <button onClick={async()=>{if(confirm(`Hapus pengajuan "${s.storeName}"?`)){await deleteSubmission(s.id);router.refresh();}}}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>;
            })}
            {filtered.length===0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">Tidak ada data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
    <Modal open={!!selected} onClose={()=>setSelected(null)} title="Detail Pengajuan">
      {selected && <div className="space-y-4">
        <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{selected.storeName}</h3>{sb(selected.approvalStatus)}</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-slate-500">PIC</p><p className="font-medium">{selected.picName}</p></div>
          <div><p className="text-slate-500">Tanggal</p><p className="font-medium">{formatDate(selected.proposedDate)}</p></div>
          <div><p className="text-slate-500">Jenis</p><p className="font-medium">{selected.activationType.replace(/_/g," ")}</p></div>
          {selected.objectiveType && <div><p className="text-slate-500">Tujuan</p><p className="font-medium">{objLabels[selected.objectiveType]}</p></div>}
          {selected.approvedBy && <div><p className="text-slate-500">Disetujui</p><p className="font-medium">{selected.approvedBy}</p></div>}
        </div>

        {/* Data bulan lalu */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
          <div><p className="text-xs text-slate-500">Sales Bulan Lalu</p><p className="text-sm font-semibold text-slate-900">{formatCurrency(selected.lastMonthSales)}</p></div>
          <div><p className="text-xs text-slate-500">Transaksi Bulan Lalu</p><p className="text-sm font-semibold text-slate-900">{selected.lastMonthTransactions?.toLocaleString("id-ID") || "-"}</p></div>
        </div>

        {/* Target cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <p className="text-xs text-indigo-600 font-medium">Target Revenue</p>
            <p className="text-sm font-bold text-indigo-900">{formatCurrency(selected.targetValue)}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <p className="text-xs text-indigo-600 font-medium">Target Transaksi</p>
            <p className="text-sm font-bold text-indigo-900">{selected.targetTransactions?.toLocaleString("id-ID") || "-"}</p>
          </div>
        </div>

        {selected.objectiveType === "TRAFFIC" && selected.managerTarget > 0 && (
          <div className="p-3 bg-indigo-50 rounded-xl flex items-center gap-2">
            <Target size={16} className="text-indigo-600" />
            <span className="text-sm font-medium text-indigo-800">Target Pengunjung: {selected.managerTarget.toLocaleString("id-ID")} orang</span>
          </div>
        )}

        {selected.descriptionTarget && <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 mb-1">Deskripsi</p><p className="text-sm">{selected.descriptionTarget}</p></div>}
        {selected.budgets?.length > 0 && <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Rincian Biaya</p>
          <div className="space-y-1.5">
            {selected.budgets.map((b:any)=>(
              <div key={b.id} className="flex justify-between text-sm p-2 bg-slate-50 rounded-lg">
                <span>{b.itemDescription} <span className="text-slate-400">({b.budgetCategory})</span></span>
                <span className="font-medium">{formatCurrency(b.estimatedCost)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 p-2 bg-indigo-50 rounded-lg text-sm font-bold text-indigo-800">
            <span>Total Estimasi</span><span>{formatCurrency(selected.budgets.reduce((s:number,b:any)=>s+b.estimatedCost,0))}</span>
          </div>
        </div>}
        {selected.approvalStatus==="Pending" && <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sesuaikan Target Revenue</label>
            <NumberInput value={adjRevenue} onChange={setAdjRevenue} prefix="Rp" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sesuaikan Target Transaksi</label>
            <NumberInput value={adjTransactions} onChange={setAdjTransactions} />
          </div>
          <div className="flex gap-3">
            <Button variant="success" size="sm" onClick={handleApproveWithTargets} disabled={loading===selected.id}><Check size={14}/> Approve & Simpan Target</Button>
            <Button variant="danger" size="sm" onClick={()=>{handleAction(selected.id, "Rejected"); setSelected(null);}}><X size={14}/> Reject</Button>
          </div>
        </div>}
      </div>}
    </Modal>
  </div>;
}
