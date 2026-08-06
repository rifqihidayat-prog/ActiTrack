"use client";
import { useState } from "react";
import { healSurveyRoutes } from "@/lib/actions";
import { RefreshCw } from "lucide-react";

export default function HealSurveyButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await healSurveyRoutes();
      setMsg(`Selesai: ${res.healed} rute diperbaiki, ${res.skipped} sudah lengkap.`);
    } catch (e: any) {
      setMsg(`Gagal: ${e?.message || "terjadi kesalahan"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm disabled:opacity-50"
        style={{ background: "var(--ga-blue)" }}
      >
        <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
        {busy ? "Memproses..." : "Perbaiki Data Survey"}
      </button>
      {msg && <p className="text-sm" style={{ color: "var(--ga-text-secondary)" }}>{msg}</p>}
    </div>
  );
}