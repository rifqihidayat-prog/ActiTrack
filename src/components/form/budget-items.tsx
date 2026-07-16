"use client";
import { Plus, Trash2 } from "lucide-react";
import NumberInput from "@/components/ui/number-input";

const categories = ["ATK", "CETAK", "SEWA", "KONSUMSI", "TRANSPORT", "DOKUMENTASI", "LAINNYA"];

export default function BudgetItems({ items, setItems }: {
  items: { budgetCategory: string; itemDescription: string; estimatedCost: string }[];
  setItems: (items: { budgetCategory: string; itemDescription: string; estimatedCost: string }[]) => void;
}) {
  const addItem = () => setItems([...items, { budgetCategory: "", itemDescription: "", estimatedCost: "" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: string, v: string) => {
    const updated = items.map((item, idx) => idx === i ? { ...item, [k]: v } : item);
    setItems(updated);
  };
  return (
    <div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl animate-fade-in border border-slate-100">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={item.budgetCategory} onChange={e => updateItem(i, "budgetCategory", e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white">
                <option value="">Kategori</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={item.itemDescription} onChange={e => updateItem(i, "itemDescription", e.target.value)} placeholder="Deskripsi item" className="px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
              <NumberInput value={item.estimatedCost} onChange={v => updateItem(i, "estimatedCost", v)} prefix="Rp" placeholder="0" className="py-2 text-sm rounded-lg" />
            </div>
            <button onClick={() => removeItem(i)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="mt-3 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all duration-200">
        <Plus size={16} /> Tambah Item Biaya
      </button>
    </div>
  );
}
