"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { submitEventResult } from "@/lib/actions";
import { Save, TrendingUp, TrendingDown, Plus, Trash2, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import NumberInput from "@/components/ui/number-input";
import { unformat } from "@/components/ui/number-input";

const CATEGORIES = [
  { value: "ATK", label: "ATK & Cetakan" },
  { value: "CETAK", label: "Cetak/Print" },
  { value: "KONSUMSI", label: "Konsumsi" },
  { value: "SEWA", label: "Sewa" },
  { value: "TRANSPORT", label: "Transportasi" },
  { value: "DOKUMENTASI", label: "Dokumentasi" },
  { value: "LAINNYA", label: "Lainnya" },
];

export default function EventResultForm({ submissionId, initial, submission }: { submissionId: number; initial?: any; submission?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    actualSales: initial?.actualSales ? Number(initial.actualSales).toLocaleString("id-ID") : "",
    transactionCount: initial?.transactionCount ? Number(initial.transactionCount).toLocaleString("id-ID") : "",
    vouchersDistributed: initial?.vouchersDistributed ? Number(initial.vouchersDistributed).toLocaleString("id-ID") : "",
    vouchersRedeemed: initial?.vouchersRedeemed ? Number(initial.vouchersRedeemed).toLocaleString("id-ID") : "",
    voucherCode: initial?.voucherCode ?? "",
    notes: initial?.notes ?? "",
  });

  const costItemsInit = useMemo(() => {
    if (initial?.costItems?.length) return initial.costItems.map((c: any) => ({ ...c, actualCost: Number(c.actualCost).toLocaleString("id-ID"), _key: Math.random().toString() }));
    return [];
  }, [initial]);
  const [costItems, setCostItems] = useState<any[]>(costItemsInit);

  const promoItemsInit = useMemo(() => {
    if (initial?.promoItems?.length) return initial.promoItems.map((p: any) => ({ ...p, _key: Math.random().toString() }));
    return [];
  }, [initial]);
  const [promoItems, setPromoItems] = useState<any[]>(promoItemsInit);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const sales = unformat(form.actualSales);
  const totalCost = costItems.reduce((s, c) => s + (unformat(String(c.actualCost)) || 0), 0);
  const targetRevenue = (submission?.managerTarget || submission?.targetValue || 0);
  const targetTx = submission?.targetTransactions || 0;
  const revPct = targetRevenue > 0 ? (sales / targetRevenue * 100) : 0;
  const txPct = targetTx > 0 ? ((unformat(form.transactionCount) || 0) / targetTx * 100) : 0;
  const bep = totalCost > 0 ? (sales >= totalCost) : false;
  const profit = sales - totalCost;

  const totalPromo = promoItems.reduce((s, p) => s + ((Number(p.quantity) || 0) * (Number(p.price) || 0)), 0);
  const regularSales = Math.max(0, sales - totalPromo);

  const addItem = () => setCostItems(p => [...p, { budgetCategory: CATEGORIES[0].value, itemDescription: "", actualCost: "", _key: Math.random().toString() }]);
  const removeItem = (key: string) => setCostItems(p => p.filter(c => c._key !== key));
  const updateItem = (key: string, field: string, value: any) => setCostItems(p => p.map(c => c._key === key ? { ...c, [field]: value } : c));

  const addPromoItem = () => setPromoItems(p => [...p, { productName: "", quantity: 0, price: 0, _key: Math.random().toString() }]);
  const removePromoItem = (key: string) => setPromoItems(p => p.filter(c => c._key !== key));
  const updatePromoItem = (key: string, field: string, value: any) => setPromoItems(p => p.map(c => c._key === key ? { ...c, [field]: value } : c));

  const copyFromEstimasi = () => {
    if (!submission?.budgets?.length) return;
    setCostItems(submission.budgets.map((b: any) => ({
      budgetCategory: b.budgetCategory,
      itemDescription: b.itemDescription,
      actualCost: Number(b.estimatedCost).toLocaleString("id-ID"),
      _key: Math.random().toString(),
    })));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitEventResult(submissionId, {
        actualSales: unformat(form.actualSales),
        transactionCount: unformat(form.transactionCount),
        voucherCode: form.voucherCode,
        vouchersDistributed: unformat(form.vouchersDistributed),
        vouchersRedeemed: unformat(form.vouchersRedeemed),
        actualTotalCost: totalCost,
        promoSales: totalPromo,
        notes: form.notes,
      },
        costItems.map(c => ({ budgetCategory: c.budgetCategory, itemDescription: c.itemDescription, actualCost: unformat(String(c.actualCost)) || 0 })),
        promoItems.map(p => ({ productName: p.productName, quantity: Number(p.quantity) || 0, price: Number(p.price) || 0 }))
      );
      router.refresh();
      router.push(`/submissions/${submissionId}`);
    } catch (e) { console.error(e); setLoading(false); }
  };

  return (
    <div className="space-y-6">
      {(sales > 0 || totalCost > 0 || unformat(form.transactionCount) > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {targetRevenue > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target Revenue</p>
              <p className="text-lg font-bold mt-1" style={{ color: revPct >= 100 ? "var(--ga-green)" : "var(--ga-text)" }}>{formatCurrency(sales)}</p>
              <div className="mt-2 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(revPct, 100)}%`, background: revPct >= 100 ? "var(--ga-green)" : "var(--ga-blue)" }} />
              </div>
              <p className="text-xs mt-1 text-slate-500">{revPct.toFixed(0)}% dari target {formatCurrency(targetRevenue)}</p>
            </div>
          )}
          {targetTx > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target Transaksi</p>
              <p className="text-lg font-bold mt-1" style={{ color: txPct >= 100 ? "var(--ga-green)" : "var(--ga-text)" }}>{(unformat(form.transactionCount) || 0).toLocaleString("id-ID")}</p>
              <div className="mt-2 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(txPct, 100)}%`, background: txPct >= 100 ? "var(--ga-green)" : "var(--ga-blue)" }} />
              </div>
              <p className="text-xs mt-1 text-slate-500">{txPct.toFixed(0)}% dari target {targetTx.toLocaleString("id-ID")}</p>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Biaya Riil</p>
            <p className="text-lg font-bold mt-1" style={{ color: "var(--ga-text)" }}>{formatCurrency(totalCost)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-500">Estimasi: {formatCurrency(submission?.budgets?.reduce((s:number,b:any)=>s+b.estimatedCost,0) ?? 0)}</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">BEP / Profit</p>
            <div className="flex items-center gap-2 mt-1">
              {bep ? <TrendingUp size={20} className="text-ga-green" /> : <TrendingDown size={20} className="text-ga-red" />}
              <p className="text-lg font-bold mt-1" style={{ color: bep ? "var(--ga-green)" : "var(--ga-red)" }}>
                {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
              </p>
            </div>
            <p className="text-xs mt-1" style={{ color: bep ? "var(--ga-green)" : "var(--ga-red)" }}>
              {bep ? "BEP Tercapai ✓" : "BEP Belum Tercapai"}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Data Realisasi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Pencapaian Sales (Rp)</label>
            <NumberInput value={form.actualSales} onChange={v => update("actualSales", v)} prefix="Rp" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Jumlah Transaksi</label>
            <NumberInput value={form.transactionCount} onChange={v => update("transactionCount", v)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Voucher Dibagikan</label>
            <NumberInput value={form.vouchersDistributed} onChange={v => update("vouchersDistributed", v)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Voucher Di-redeem</label>
            <NumberInput value={form.vouchersRedeemed} onChange={v => update("vouchersRedeemed", v)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Kode Unik Voucher</label>
            <input value={form.voucherCode} onChange={e => update("voucherCode", e.target.value)} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" placeholder="Cth: VC-MAJU-001" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Rincian Promo Khusus</h2>
          <Button variant="outline" onClick={addPromoItem}>
            <Plus size={14} /> Tambah Item
          </Button>
        </div>
        {promoItems.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">Belum ada item promo. Klik "Tambah Item" untuk menambahkan produk promo.</p>
        )}
        <div className="space-y-3">
          {promoItems.map((item, idx) => {
            const sub = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            return (
              <div key={item._key} className="flex gap-3 items-start p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="flex-1">
                  <input value={item.productName} onChange={e => updatePromoItem(item._key, "productName", e.target.value)} type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" placeholder="Nama produk promo" />
                </div>
                <div className="w-1/6">
                  <NumberInput value={String(item.quantity ?? "")} onChange={v => updatePromoItem(item._key, "quantity", v)} placeholder="Qty" className="py-2 text-sm rounded-lg" />
                </div>
                <div className="w-1/5">
                  <NumberInput value={String(item.price ?? "")} onChange={v => updatePromoItem(item._key, "price", v)} prefix="Rp" placeholder="Harga" className="py-2 text-sm rounded-lg" />
                </div>
                <div className="w-1/6 flex items-center justify-end text-sm font-semibold text-indigo-600">
                  Rp {sub.toLocaleString("id-ID")}
                </div>
                <button onClick={() => removePromoItem(item._key)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
        {promoItems.length > 0 && (
          <div className="mt-4 space-y-1 text-right text-sm">
            <p className="font-semibold text-slate-700">Total Promo: {formatCurrency(totalPromo)}</p>
            {sales > 0 && (
              <p className="text-slate-500">Sales Reguler (otomatis): {formatCurrency(regularSales)}</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Catatan & Pengaturan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan Evaluasi</label>
            <textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none" placeholder="Catatan hasil evaluasi acara..." />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Rincian Biaya Riil</h2>
          <div className="flex gap-2">
            {submission?.budgets?.length > 0 && (
              <Button variant="ghost" onClick={copyFromEstimasi}>
                <Copy size={14} /> Salin dari Estimasi
              </Button>
            )}
            <Button variant="outline" onClick={addItem}>
              <Plus size={14} /> Tambah Item
            </Button>
          </div>
        </div>
        {costItems.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">Belum ada item biaya. Klik "Salin dari Estimasi" atau "Tambah Item"</p>
        )}
        <div className="space-y-3">
          {costItems.map((item, idx) => (
            <div key={item._key} className="flex gap-3 items-start p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="w-1/4">
                <select value={item.budgetCategory} onChange={e => updateItem(item._key, "budgetCategory", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <input value={item.itemDescription} onChange={e => updateItem(item._key, "itemDescription", e.target.value)} type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" placeholder="Deskripsi item" />
              </div>
              <div className="w-1/5">
                <NumberInput value={String(item.actualCost ?? "")} onChange={v => updateItem(item._key, "actualCost", v)} placeholder="Biaya" className="py-2 text-sm rounded-lg" />
              </div>
              <button onClick={() => removeItem(item._key)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right text-sm font-semibold text-slate-700">
          Total Biaya: {formatCurrency(totalCost)}
          {submission?.budgets?.length > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              (Estimasi: {formatCurrency(submission.budgets.reduce((s:number,b:any)=>s+b.estimatedCost,0))})
            </span>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit} disabled={loading}><Save size={16} /> {loading ? "Menyimpan..." : "Simpan Hasil Event"}</Button>
        </div>
      </div>
    </div>
  );
}
