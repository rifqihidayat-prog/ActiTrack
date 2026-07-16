"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction } from "./actions";
import { Activity } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await loginAction(username, password);
      if (result.error) { setError(result.error); setLoading(false); return; }
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
      router.refresh();
    } catch { setError("Terjadi kesalahan"); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ga-bg)] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ background: "var(--ga-blue-light)" }}>
              <Activity size={24} className="text-ga-blue" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold" style={{ color: "var(--ga-text)" }}>ActiTrack</h1>
              <p className="text-xs" style={{ color: "var(--ga-text-muted)" }}>Aktivasi Toko Management</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Masuk</h2>
          {error && <p className="text-sm text-ga-red bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all shadow-sm" style={{ background: loading ? "#94a3b8" : "var(--ga-blue)" }}>
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
