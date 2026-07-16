"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUser, deleteUser } from "@/lib/actions";
import Button from "@/components/ui/button";
import { Plus, Pencil, Trash2, User, X } from "lucide-react";

type UserData = { id: number; username: string; name: string; storeName: string; role: string; };

export default function UserManager({ users }: { users: UserData[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserData | null>(null);
  const [form, setForm] = useState({ username: "", password: "", name: "", storeName: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => { setForm({ username: "", password: "", name: "", storeName: "", role: "user" }); setEditing(null); setShowForm(false); setError(""); };

  const openEdit = (u: UserData) => {
    setForm({ username: u.username, password: "", name: u.name, storeName: u.storeName, role: u.role });
    setEditing(u); setShowForm(true);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.username || !form.name || !form.storeName || (!editing && !form.password)) {
      setError("Semua field harus diisi");
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        const data: any = { username: form.username, name: form.name, storeName: form.storeName, role: form.role };
        if (form.password) data.password = form.password;
        await updateUser(editing.id, data);
      } else {
        await createUser(form);
      }
      reset(); router.refresh();
    } catch (e: any) {
      setError(e?.message || "Gagal menyimpan pengguna");
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus user "${name}"?`)) return;
    await deleteUser(id); router.refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola akun pengguna sistem</p>
        </div>
        {!showForm && <Button onClick={() => setShowForm(true)}><Plus size={16} /> Tambah Pengguna</Button>}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{editing ? "Edit Pengguna" : "Tambah Pengguna Baru"}</h2>
            <button onClick={reset} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password {editing && "(kosongkan jika tidak diubah)"}</label>
              <input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Toko</label>
              <input value={form.storeName} onChange={e => setForm(p => ({ ...p, storeName: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-4">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>Batal</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Toko</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "var(--ga-blue)" }}>
                      {u.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{u.username}</td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{u.storeName}</td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                    {u.role === "admin" ? "Admin" : "User"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-slate-400 hover:text-ga-blue transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(u.id, u.name)} className="p-1.5 text-slate-400 hover:text-ga-red transition-colors"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
