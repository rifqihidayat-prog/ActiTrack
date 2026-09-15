"use client";
import { useState } from "react";
import { MessageCircle, Send, ExternalLink } from "lucide-react";

interface Props {
  route: {
    id: number;
    storeName: string;
    picName: string;
    type?: string;
    createdAt?: string;
    totalDistance?: number | null;
  };
  summaryInfo?: {
    durationStr?: string;
    photoCount?: number;
    kelurahan?: string;
    kecamatan?: string;
    city?: string;
    coverageMessage?: string;
  };
  className?: string;
}

export default function WhatsAppReportButton({ route, summaryInfo, className = "" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const generateWhatsAppMessage = () => {
    const distKm = route.totalDistance ? (route.totalDistance / 1000).toFixed(2) : "0";
    const dateStr = route.createdAt
      ? new Date(route.createdAt).toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("id-ID");

    const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const reportUrl = `${appOrigin}/api/survey/${route.id}/report`;

    return `*LAPORAN SURVEY & TRACKING LAPANGAN*
*ActiTrack — Retail Operations*
---------------------------------------
📍 *Toko:* ${route.storeName}
👤 *Petugas/PIC:* ${route.picName || "-"}
📅 *Tanggal:* ${dateStr}
⏱️ *Durasi:* ${summaryInfo?.durationStr || "-"}
🛣️ *Jarak Tempuh:* ${distKm} km
📸 *Dokumentasi:* ${summaryInfo?.photoCount || 0} Titik Foto
---------------------------------------
🏘️ *Kelurahan/Desa:* ${summaryInfo?.kelurahan || "-"}
🏛️ *Kecamatan & Kota:* ${summaryInfo?.kecamatan || "-"}, ${summaryInfo?.city || "-"}
🎯 *Status Coverage:* ${summaryInfo?.coverageMessage || "Dalam Area Coverage"}
---------------------------------------
📄 *Download Laporan Resmi (.docx):*
${reportUrl}`;
  };

  const handleOpenWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const text = generateWhatsAppMessage();
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, "_blank");
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm active:scale-98 transition-all ${className}`}
      >
        <MessageCircle size={18} />
        Kirim ke WhatsApp
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <MessageCircle size={18} className="text-emerald-500" />
                Kirim Laporan via WhatsApp
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Pesan ringkasan lengkap (durasi, jarak, kelurahan, kecamatan, coverage, dan link download Word .docx) akan langsung terisi di aplikasi WhatsApp.
            </p>

            <form onSubmit={handleOpenWhatsApp} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Nomor WhatsApp Atasan (Opsional)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Contoh: 08123456789 (atau kosongkan)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  *Bisa dikosongkan jika ingin langsung memilih kontak/grup di WhatsApp.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <ExternalLink size={14} />
                  Buka WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
