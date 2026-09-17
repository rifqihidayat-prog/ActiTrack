"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUser, deleteUser } from "@/lib/actions";
import Button from "@/components/ui/button";
import { Plus, Pencil, Trash2, User, X, MapPin, LocateFixed, Loader2 } from "lucide-react";

type UserData = {
  id: number;
  username: string;
  name: string;
  storeName: string;
  role: string;
  storeLat?: number | null;
  storeLng?: number | null;
  coverageRadiusKm?: number;
};

export default function UserManager({ users }: { users: UserData[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserData | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    storeName: "",
    role: "user",
    storeLat: "",
    storeLng: "",
    coverageRadiusKm: "5.0",
  });
  const [loading, setLoading] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setForm({
      username: "",
      password: "",
      name: "",
      storeName: "",
      role: "user",
      storeLat: "",
      storeLng: "",
      coverageRadiusKm: "5.0",
    });
    setEditing(null);
    setShowForm(false);
    setError("");
  };

  const openEdit = (u: UserData) => {
    setForm({
      username: u.username,
      password: "",
      name: u.name,
      storeName: u.storeName,
      role: u.role,
      storeLat: u.storeLat != null ? String(u.storeLat) : "",
      storeLng: u.storeLng != null ? String(u.storeLng) : "",
      coverageRadiusKm: u.coverageRadiusKm != null ? String(u.coverageRadiusKm) : "5.0",
    });
    setEditing(u);
    setShowForm(true);
  };

  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      alert("Perangkat Anda tidak mendukung fitur lokasi GPS.");
      return;
    }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((p) => ({
          ...p,
          storeLat: pos.coords.latitude.toFixed(6),
          storeLng: pos.coords.longitude.toFixed(6),
        }));
        setGettingGps(false);
      },
      (err) => {
        setGettingGps(false);
        alert("Gagal membaca GPS: " + (err?.message || "Pastikan izin lokasi browser/perangkat Anda aktif"));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.username || !form.name || !form.storeName || (!editing && !form.password)) {
      setError("Semua field utama harus diisi");
      return;
    }
    setLoading(true);
    try {
      const lat = form.storeLat.trim() ? parseFloat(form.storeLat.trim()) : null;
      const lng = form.storeLng.trim() ? parseFloat(form.storeLng.trim()) : null;
      const radius = form.coverageRadiusKm.trim() ? parseFloat(form.coverageRadiusKm.trim()) : 5.0;

      const payload: any = {
        username: form.username,
        name: form.name,
        storeName: form.storeName,
        role: form.role,
        storeLat: lat && !isNaN(lat) ? lat : null,
        storeLng: lng && !isNaN(lng) ? lng : null,
        coverageRadiusKm: radius && !isNaN(radius) ? radius : 5.0,
      };

      if (editing) {
        if (form.password) payload.password = form.password;
        await updateUser(editing.id, payload);
      } else {
        payload.password = form.password;
        await createUser(payload);
      }
      reset();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Gagal menyimpan pengguna");
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus user "${name}"?`)) return;
    await deleteUser(id);
    router.refresh();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola akun pengguna dan titik koordinat toko cabang</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Tambah Pengguna
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {editing ? "Edit Pengguna & Titik Toko" : "Tambah Pengguna Baru & Titik Toko"}
            </h2>
            <button onClick={reset} className="p-1.5 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password {editing && "(kosongkan jika tidak diubah)"}
              </label>
              <input
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Toko Cabang</label>
              <input
                value={form.storeName}
                onChange={(e) => setForm((p) => ({ ...p, storeName: e.target.value }))}
                placeholder="Contoh: Hijrahfood Galaxy"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Bagian Titik Koordinat Toko Cabang */}
            <div className="sm:col-span-2 bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3 mt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">Titik Koordinat Toko Cabang</span>
                </div>
                <button
                  type="button"
                  onClick={handleGetCurrentGps}
                  disabled={gettingGps}
                  className="text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                >
                  {gettingGps ? (
                    <Loader2 size={13} className="animate-spin text-blue-600" />
                  ) : (
                    <LocateFixed size={13} className="text-blue-600" />
                  )}
                  <span>Ambil GPS Saat Ini</span>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Titik GPS ini menjadi acuan radar 5 km di 4 arah mata angin (Utara, Timur, Selatan, Barat) saat tim lapangan melakukan survei.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
                  <input
                    type="text"
                    placeholder="-6.2088"
                    value={form.storeLat}
                    onChange={(e) => setForm((p) => ({ ...p, storeLat: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
                  <input
                    type="text"
                    placeholder="106.8456"
                    value={form.storeLng}
                    onChange={(e) => setForm((p) => ({ ...p, storeLng: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Radius Coverage (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="5.0"
                    value={form.coverageRadiusKm}
                    onChange={(e) => setForm((p) => ({ ...p, coverageRadiusKm: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-4">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Pengguna & Titik Toko"}
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Nama
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Toko
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Koordinat Toko
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: "var(--ga-blue)" }}
                    >
                      {u.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{u.username}</td>
                <td className="px-4 py-3.5 text-sm text-slate-600 font-medium">{u.storeName}</td>
                <td className="px-4 py-3.5 text-xs">
                  {u.storeLat != null && u.storeLng != null ? (
                    <div className="space-y-0.5">
                      <div className="font-mono text-slate-800 font-medium flex items-center gap-1">
                        <MapPin size={12} className="text-blue-600" />
                        {Number(u.storeLat).toFixed(4)}, {Number(u.storeLng).toFixed(4)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold pl-4">
                        Radius {u.coverageRadiusKm || 5} km
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Belum disetel</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.role === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.role === "admin" ? "Admin" : "User"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-slate-400 hover:text-ga-blue transition-colors"
                      title="Edit Pengguna & Koordinat"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      className="p-1.5 text-slate-400 hover:text-ga-red transition-colors"
                      title="Hapus Pengguna"
                    >
                      <Trash2 size={15} />
                    </button>
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

