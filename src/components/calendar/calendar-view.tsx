"use client";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, getStatusColor, formatCurrency } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
import Button from "@/components/ui/button";

type CalendarEvent = { id: number; title: string; date: string; status: string; picName: string; description: string; totalBudget: number };
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function CalendarView({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [cm, setCm] = useState(today.getMonth());
  const [cy, setCy] = useState(today.getFullYear());
  const [sel, setSel] = useState<CalendarEvent | null>(null);

  const dim = new Date(cy, cm + 1, 0).getDate();
  const fdow = new Date(cy, cm, 1).getDay();

  const emap = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => { const k = ev.date; if (!m[k]) m[k] = []; m[k].push(ev); });
    return m;
  }, [events]);

  const days: (number | null)[] = Array(fdow).fill(null);
  for (let d = 1; d <= dim; d++) days.push(d);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const isToday = (d: number) => `${cy}-${pad(cm + 1)}-${pad(d)}` === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">{MONTHS[cm]} {cy}</h2>
            <div className="flex gap-1">
              <button onClick={() => { if (cm === 0) { setCm(11); setCy(y => y - 1); } else setCm(m => m - 1); }} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft size={18} /></button>
              <button onClick={() => { if (cm === 11) { setCm(0); setCy(y => y + 1); } else setCm(m => m + 1); }} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Pending</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Approved</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Rejected</span>
          </div>
        </div>
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {DAYS.map(d => <div key={d} className="p-3 text-center text-xs font-semibold text-slate-500 uppercase">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const ds = d ? `${cy}-${pad(cm + 1)}-${pad(d)}` : "";
            const evs = ds ? emap[ds] || [] : [];
            return (
              <div key={i} className={cn("min-h-[100px] p-2 border-b border-r border-slate-50", d ? "hover:bg-slate-50" : "bg-slate-50/50")}>
                {d && <>
                  <span className={cn("inline-flex w-7 h-7 items-center justify-center text-sm rounded-full mb-1", isToday(d) && "bg-indigo-600 text-white font-bold")}>{d}</span>
                  <div className="space-y-1">
                    {evs.slice(0, 3).map(ev => (
                      <button key={ev.id} onClick={() => setSel(ev)}
                        className={cn("w-full text-left text-xs px-2 py-1 rounded-md text-white font-medium truncate transition-transform hover:scale-[1.02]", getStatusColor(ev.status))}>
                        {ev.title}
                      </button>
                    ))}
                    {evs.length > 3 && <p className="text-xs text-slate-400 pl-1">+{evs.length - 3} lainnya</p>}
                  </div>
                </>}
              </div>
            );
          })}
        </div>
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)} title="Detail Aktivasi">
        {sel && <div className="space-y-4">
          <div className="flex items-center gap-2"><span className={cn("w-2.5 h-2.5 rounded-full", getStatusColor(sel.status))} /><span className="text-sm font-medium text-slate-900">{sel.title}</span></div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-slate-500">PIC</p><p className="font-medium">{sel.picName}</p></div>
            <div><p className="text-slate-500">Tanggal</p><p className="font-medium">{sel.date}</p></div>
            <div><p className="text-slate-500">Status</p><p className="font-medium">{sel.status}</p></div>
            <div><p className="text-slate-500">Estimasi Biaya</p><p className="font-medium">{formatCurrency(sel.totalBudget)}</p></div>
          </div>
          {sel.description && <p className="text-sm text-slate-600">{sel.description}</p>}
          <Link href={`/submissions/${sel.id}`} onClick={() => setSel(null)}><Button size="sm" className="w-full">Lihat Detail Lengkap</Button></Link>
        </div>}
      </Modal>
    </div>
  );
}
