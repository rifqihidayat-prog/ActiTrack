"use client";
import { useState, useMemo } from "react";
import Button from "@/components/ui/button";
import BudgetItems from "./budget-items";
import { createSubmission } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { CalendarDays, Store, DollarSign, CheckCircle, ChevronLeft, ChevronRight, Target, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import NumberInput from "@/components/ui/number-input";
import { unformat } from "@/components/ui/number-input";

const objectives = [
  { value: "REVENUE", label: "Pendapatan (Revenue)", desc: "Target penjualan/omset dalam Rupiah" },
  { value: "TRAFFIC", label: "Kunjungan (Traffic)", desc: "Target jumlah pengunjung toko" },
];

const CT_RATIO = 0.06;

export default function SubmissionWizard({ userStoreName, stores }: { userStoreName?: string; stores: string[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ storeName: userStoreName || "", picName: "", proposedDate: "", activationType: "", descriptionTarget: "", objectiveType: "", lastMonthSales: "", lastMonthTransactions: "", targetTraffic: "" });
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState(userStoreName || "");
  const [budgets, setBudgets] = useState<{ budgetCategory: string; itemDescription: string; estimatedCost: string }[]>([]);

  const updateForm = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const activationTypes = ["GRAND_OPENING", "REGULER", "POP_UP", "ROADSHOW", "INSTORE", "LAINNYA"];

  const totalBiaya = useMemo(() => budgets.reduce((s, b) => s + (unformat(b.estimatedCost) || 0), 0), [budgets]);
  const lastSales = unformat(form.lastMonthSales);
  const lastTx = unformat(form.lastMonthTransactions);
  const targetRevenue = lastSales + (totalBiaya / CT_RATIO);
  const targetTransactions = Math.round(lastTx * 1.5);
  const filteredStores = useMemo(
    () => stores.filter(s => s.toLowerCase().includes(search.toLowerCase())),
    [stores, search]
  );

  const canProceed = (s: number) => {
    if (s === 1) return form.storeName && form.picName && form.proposedDate && form.activationType && form.objectiveType && form.lastMonthSales && form.lastMonthTransactions;
    if (s === 2) return budgets.length > 0 && budgets.every(b => b.itemDescription && b.estimatedCost);
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const id = await createSubmission(
        {
          storeName: form.storeName,
          picName: form.picName,
          proposedDate: form.proposedDate,
          activationType: form.activationType,
          descriptionTarget: form.descriptionTarget,
          objectiveType: form.objectiveType,
          lastMonthSales: lastSales,
          lastMonthTransactions: lastTx,
          targetValue: Math.round(targetRevenue),
          targetTransactions,
        },
        budgets.map(b => ({ ...b, estimatedCost: unformat(b.estimatedCost) }))
      );
      router.push(`/submissions/${id}`);
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Gagal menyimpan pengajuan. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-0 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${step >= s ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-slate-100 text-slate-400"}`}>
              {step > s ? <CheckCircle size={16} /> : <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">{s}</span>}
              <span className="hidden sm:inline">{["Info Acara", "Rincian Biaya", "Review"][s - 1]}</span>
            </div>
            {s < 3 && <div className={`w-12 h-0.5 mx-1 ${step > s ? "bg-indigo-600" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Info Acara */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><Store size={20} /></div>
            <h2 className="text-lg font-semibold text-slate-900">Informasi Acara</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Outlet</label>
              <input value={search} onChange={e => { setSearch(e.target.value); updateForm("storeName", e.target.value); }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} placeholder="Cari atau ketik nama outlet..." className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
              {showDropdown && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredStores.length > 0 ? filteredStores.map(s => (
                    <button key={s} type="button" onMouseDown={() => { setSearch(s); updateForm("storeName", s); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-slate-100 last:border-b-0 flex items-center gap-2">
                      <Store size={14} className="text-slate-400 flex-shrink-0" />
                      <span>{s}</span>
                    </button>
                  )) : (
                    <div className="px-4 py-3 text-sm text-slate-400">Tidak ada outlet ditemukan</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama PIC</label>
              <input value={form.picName} onChange={e => updateForm("picName", e.target.value)} placeholder="Nama penanggung jawab" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Aktivasi</label>
              <input type="date" value={form.proposedDate} onChange={e => updateForm("proposedDate", e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis Aktivasi</label>
              <select value={form.activationType} onChange={e => updateForm("activationType", e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm bg-white">
                <option value="">Pilih jenis...</option>
                {activationTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi Acara</label>
              <textarea value={form.descriptionTarget} onChange={e => updateForm("descriptionTarget", e.target.value)} rows={2} placeholder="Deskripsikan acara..." className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm resize-none" />
            </div>

            {/* Data Bulan Lalu */}
            <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <p className="text-sm font-semibold text-slate-900 mb-1">Data Offline Bulan Lalu</p>
              <p className="text-xs text-slate-500 mb-3">Isi sales & transaksi di hari & week yang sama bulan lalu sebagai baseline target</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Sales Offline (Rp)</label>
                  <NumberInput value={form.lastMonthSales} onChange={v => updateForm("lastMonthSales", v)} prefix="Rp" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Transaksi Offline</label>
                  <NumberInput value={form.lastMonthTransactions} onChange={v => updateForm("lastMonthTransactions", v)} />
                </div>
              </div>
            </div>

            {/* Tujuan */}
            <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <p className="text-sm font-semibold text-slate-900 mb-3">Tujuan Aktivasi</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {objectives.map(o => (
                  <button key={o.value} type="button" onClick={() => updateForm("objectiveType", o.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.objectiveType === o.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <p className="text-sm font-semibold text-slate-900">{o.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
              {form.objectiveType === "TRAFFIC" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Pengunjung (orang)</label>
                  <NumberInput value={form.targetTraffic} onChange={v => updateForm("targetTraffic", v)} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Rincian Biaya */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><DollarSign size={20} /></div>
            <h2 className="text-lg font-semibold text-slate-900">Rincian Rencana Biaya</h2>
          </div>
          <BudgetItems items={budgets} setItems={setBudgets} />

          {/* Live Target Preview */}
          {totalBiaya > 0 && (
            <div className="mt-6 p-4 bg-indigo-50 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Estimasi Target Otomatis</p>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp size={16} className="text-indigo-600" />
                <span className="text-indigo-800">
                  Kenaikan Revenue:{' '}
                  <strong className="text-indigo-900">{(totalBiaya / CT_RATIO).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
                  {' '}(rasio biaya 6%)
                </span>
              </div>
              <div className="text-sm text-indigo-800">
                Target Revenue:{' '}
                <strong className="text-indigo-900">
                  {lastSales > 0 ? `${(lastSales + totalBiaya / CT_RATIO).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : formatCurrency(Math.round(totalBiaya / CT_RATIO))}
                </strong>
                {' '}— Target Transaksi:{' '}
                <strong className="text-indigo-900">{targetTransactions.toLocaleString("id-ID")} (+50%)</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 animate-fade-in shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle size={20} /></div>
            <h2 className="text-lg font-semibold text-slate-900">Review Pengajuan</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div><p className="text-xs text-slate-500">Outlet</p><p className="font-medium text-slate-900">{form.storeName}</p></div>
              <div><p className="text-xs text-slate-500">PIC</p><p className="font-medium text-slate-900">{form.picName}</p></div>
              <div><p className="text-xs text-slate-500">Tanggal</p><p className="font-medium text-slate-900">{form.proposedDate}</p></div>
              <div><p className="text-xs text-slate-500">Jenis</p><p className="font-medium text-slate-900">{form.activationType.replace(/_/g, " ")}</p></div>
              <div><p className="text-xs text-slate-500">Sales Bulan Lalu</p><p className="font-medium text-slate-900">{formatCurrency(lastSales)}</p></div>
              <div><p className="text-xs text-slate-500">Transaksi Bulan Lalu</p><p className="font-medium text-slate-900">{lastTx.toLocaleString("id-ID")}</p></div>
            </div>
            {form.objectiveType && (
              <div className="p-4 bg-indigo-50 rounded-xl">
                <p className="text-xs text-indigo-600 mb-1 font-medium">Tujuan: {objectives.find(o => o.value === form.objectiveType)?.label}</p>
                <p className="text-sm font-semibold text-indigo-900">
                  Target Revenue: {formatCurrency(Math.round(targetRevenue))}
                </p>
                <p className="text-sm text-indigo-800">
                  Target Transaksi: {targetTransactions.toLocaleString("id-ID")}
                </p>
                {form.objectiveType === "TRAFFIC" && form.targetTraffic && (
                  <p className="text-sm text-indigo-800 mt-1">Target Pengunjung: {unformat(form.targetTraffic).toLocaleString("id-ID")} orang</p>
                )}
              </div>
            )}
            {form.descriptionTarget && (
              <div className="p-4 bg-slate-50 rounded-xl"><p className="text-xs text-slate-500 mb-1">Deskripsi</p><p className="text-sm text-slate-700">{form.descriptionTarget}</p></div>
            )}
            {budgets.length > 0 && (
              <div><p className="text-xs font-medium text-slate-500 mb-2">Rincian Biaya ({budgets.length} item)</p>
                <div className="space-y-2">
                  {budgets.map((b, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"><div><p className="text-sm font-medium text-slate-900">{b.itemDescription}</p><p className="text-xs text-slate-500">{b.budgetCategory}</p></div><p className="text-sm font-semibold text-indigo-600">Rp {unformat(b.estimatedCost).toLocaleString("id-ID")}</p></div>
                  ))}
                </div>
              </div>
            )}
            {budgets.length > 0 && (
              <div className="flex justify-between p-4 bg-indigo-50 rounded-xl"><span className="text-sm font-medium text-indigo-800">Total Estimasi Biaya</span><span className="text-sm font-bold text-indigo-800">Rp {totalBiaya.toLocaleString("id-ID")}</span></div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 animate-fade-in">
          {error}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
          <ChevronLeft size={16} /> Sebelumnya
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed(step)}>
            Selanjutnya <ChevronRight size={16} />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Menyimpan..." : "Ajukan Aktivasi"} <CheckCircle size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
