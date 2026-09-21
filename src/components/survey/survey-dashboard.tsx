"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Smartphone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Route as RouteIcon,
  Camera,
  Clock,
  Search,
  Filter,
  Download,
  Store,
  Layers,
  Repeat,
  Info,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SurveyAnalyticsResult,
  StoreMonthlySummary,
  OverlapDetail,
  formatMonthLabel,
  getMonthKeyFromDate,
} from "@/lib/survey-analytics";

interface RouteItem {
  id: number;
  type: string;
  storeName: string;
  picName: string;
  startTime?: string | null;
  endTime?: string | null;
  totalDistance?: number | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  waypoints?: { lat: number; lng: number; timestamp?: string | null }[];
  photos?: { id?: number; lat: number; lng: number; caption?: string | null; timestamp?: string | null }[];
}

interface SurveyDashboardProps {
  initialData: SurveyAnalyticsResult;
  allRoutes: RouteItem[];
  userRole?: string;
}

export default function SurveyDashboard({
  initialData,
  allRoutes,
  userRole,
}: SurveyDashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"rekap" | "titik-sama" | "riwayat">("rekap");

  // Filter rute berdasarkan bulan yang dipilih
  const monthFilteredRoutes = useMemo(() => {
    if (selectedMonth === "all") return allRoutes;
    return allRoutes.filter((r) => getMonthKeyFromDate(r.createdAt) === selectedMonth);
  }, [allRoutes, selectedMonth]);

  // Hitung ulang rekap per toko dan statistik secara reaktif di client saat filter bulan berubah
  const { currentSummaries, overallStats, filteredOverlaps, routeOverlapMap } = useMemo(() => {
    const routeMap = initialData.routeOverlapMap;

    // Filter overlaps untuk bulan terpilih (jika ada overlap pada rute di bulan tersebut)
    const monthRouteIds = new Set(monthFilteredRoutes.map((r) => r.id));
    const filteredOverlaps = initialData.allOverlaps.filter(
      (ov) => monthRouteIds.has(ov.routeId) || monthRouteIds.has(ov.otherRouteId)
    );

    // Hitung rekap per toko
    const storeMap: Record<string, StoreMonthlySummary> = {};

    for (const r of monthFilteredRoutes) {
      const store = r.storeName || "Tanpa Nama Toko";
      if (!storeMap[store]) {
        storeMap[store] = {
          storeName: store,
          monthKey: selectedMonth,
          monthLabel: formatMonthLabel(selectedMonth),
          mailerCount: 0,
          observasiCount: 0,
          totalSurveys: 0,
          totalDistanceKm: 0,
          totalPhotos: 0,
          hasOverlap: false,
          overlapCount: 0,
          overlapRoutes: [],
          overlapRemarks: [],
          lastSurveyAt: null,
        };
      }

      const item = storeMap[store];
      item.totalSurveys += 1;

      if (r.type === "mailer") {
        item.mailerCount += 1;
      } else {
        item.observasiCount += 1;
      }

      if (r.totalDistance && r.totalDistance > 0) {
        item.totalDistanceKm += r.totalDistance / 1000;
      }

      if (r.photos) {
        item.totalPhotos += r.photos.length;
      }

      const overlaps = routeMap[r.id];
      if (overlaps && overlaps.length > 0) {
        item.hasOverlap = true;
        for (const ov of overlaps) {
          if (!item.overlapRoutes.includes(ov.routeId)) {
            item.overlapRoutes.push(ov.routeId);
          }
          if (!item.overlapRemarks.includes(ov.message)) {
            item.overlapRemarks.push(ov.message);
          }
        }
      }

      if (!item.lastSurveyAt || new Date(r.createdAt).getTime() > new Date(item.lastSurveyAt).getTime()) {
        item.lastSurveyAt = r.createdAt;
      }
    }

    for (const s of Object.values(storeMap)) {
      s.overlapCount = s.overlapRoutes.length;
      s.totalDistanceKm = Math.round(s.totalDistanceKm * 100) / 100;
    }

    const summaries = Object.values(storeMap).sort((a, b) => b.totalSurveys - a.totalSurveys);

    let totalSurveys = 0;
    let totalMailer = 0;
    let totalObservasi = 0;
    let totalDistanceKm = 0;
    let totalRepeatedCount = 0;

    for (const s of summaries) {
      totalSurveys += s.totalSurveys;
      totalMailer += s.mailerCount;
      totalObservasi += s.observasiCount;
      totalDistanceKm += s.totalDistanceKm;
      if (s.hasOverlap) totalRepeatedCount += s.overlapCount;
    }

    return {
      currentSummaries: summaries,
      overallStats: {
        totalSurveys,
        totalMailer,
        totalObservasi,
        totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
        totalStores: summaries.length,
        totalRepeatedCount,
      },
      filteredOverlaps,
      routeOverlapMap: routeMap,
    };
  }, [initialData, monthFilteredRoutes, selectedMonth]);

  // Daftar nama toko unik untuk opsi filter toko
  const storeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRoutes) {
      if (r.storeName) set.add(r.storeName);
    }
    return Array.from(set).sort();
  }, [allRoutes]);

  // Filter rute untuk daftar riwayat (pencarian teks, filter tipe, filter toko)
  const displayedRoutes = useMemo(() => {
    return monthFilteredRoutes.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (selectedStoreFilter !== "all" && r.storeName !== selectedStoreFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStore = (r.storeName || "").toLowerCase().includes(q);
        const matchPic = (r.picName || "").toLowerCase().includes(q);
        const matchNotes = (r.notes || "").toLowerCase().includes(q);
        return matchStore || matchPic || matchNotes;
      }
      return true;
    });
  }, [monthFilteredRoutes, typeFilter, selectedStoreFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--ga-text)" }}>
              Dashboard Survey & Tracking
            </h1>
            <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
              Live Tracker
            </Badge>
          </div>
          <p className="text-sm mt-1 text-slate-500">
            Monitoring frekuensi sebar mailer/observasi bulanan per toko, deteksi titik berulang, dan rekaman rute GPS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/survey/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md"
            style={{ background: "var(--ga-blue)" }}
          >
            <Smartphone size={16} /> Survey Baru (HP)
          </Link>
        </div>
      </div>

      {/* Filter Bar: Pemilihan Bulan & Toko */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Calendar size={14} className="text-blue-600" /> Periode Bulan:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {initialData.availableMonths.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(m.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedMonth === m.key
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-700"
                }`}
              >
                {m.label}
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedMonth === m.key ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {m.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedMonth !== "all" && (
          <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
            Menampilkan data untuk: <strong>{formatMonthLabel(selectedMonth)}</strong>
          </span>
        )}
      </div>

      {/* KPI Cards / Ringkasan Metrik Utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Frekuensi Sebar Mailer */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Frekuensi Sebar Mailer
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {overallStats.totalMailer}
            </span>
            <span className="text-xs font-medium text-slate-500">kali sebar</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Distribusi brosur & flyer ke lingkungan warga
          </p>
        </div>

        {/* Frekuensi Observasi */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Frekuensi Observasi
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Store size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {overallStats.totalObservasi}
            </span>
            <span className="text-xs font-medium text-slate-500">kali kunjungan</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Pengenalan toko & mapping rute potensi
          </p>
        </div>

        {/* Total Jarak Tempuh */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Jarak Tempuh
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <RouteIcon size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {overallStats.totalDistanceKm}
            </span>
            <span className="text-xs font-medium text-slate-500">km terjelajah</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total rute tracking seluruh survei
          </p>
        </div>

        {/* Deteksi Titik Berulang */}
        <div
          className={`rounded-2xl p-5 shadow-sm border relative overflow-hidden ${
            overallStats.totalRepeatedCount > 0
              ? "bg-amber-50/70 border-amber-200 text-amber-900"
              : "bg-white border-slate-100 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Titik Berulang
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                overallStats.totalRepeatedCount > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {overallStats.totalRepeatedCount > 0 ? (
                <AlertTriangle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold">
              {overallStats.totalRepeatedCount}
            </span>
            <span className="text-xs font-medium text-slate-500">titik tumpang tindih</span>
          </div>
          <p className="text-[11px] mt-1 text-slate-500">
            {overallStats.totalRepeatedCount > 0
              ? "⚠️ Ditemukan rute dengan koordinat sama"
              : "✅ Semua titik menyebar ke area baru"}
          </p>
        </div>
      </div>

      {/* Tabs Navigasi: Rekap Bulanan Toko, Deteksi Titik Sama, Riwayat Rute */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("rekap")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "rekap"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Store size={16} /> Frekuensi Sebar per Toko
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
            {currentSummaries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("titik-sama")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "titik-sama"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Repeat size={16} /> Deteksi Titik / Tempat Sama
          {filteredOverlaps.length > 0 && (
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700 font-bold">
              {filteredOverlaps.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("riwayat")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "riwayat"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText size={16} /> Riwayat Seluruh Rute
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
            {displayedRoutes.length}
          </span>
        </button>
      </div>

      {/* TAB 1: REKAPITULASI FREKUENSI SEBAR BULANAN PER TOKO */}
      {activeTab === "rekap" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-900">
                  Frekuensi Sebar & Survei per Toko
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekapitulasi berapa kali toko melakukan sebar mailer/observasi dalam periode:{" "}
                  <strong className="text-blue-700">{formatMonthLabel(selectedMonth)}</strong>
                </p>
              </div>

              {selectedMonth !== "all" && (
                <button
                  onClick={() => setSelectedMonth("all")}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Tampilkan Semua Periode →
                </button>
              )}
            </div>

            {currentSummaries.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Store size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">Tidak ada data survei untuk periode ini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5">Nama Toko</th>
                      <th className="px-4 py-3.5 text-center">Frekuensi Sebar (Mailer)</th>
                      <th className="px-4 py-3.5 text-center">Frekuensi Observasi</th>
                      <th className="px-4 py-3.5 text-center">Total Survei</th>
                      <th className="px-4 py-3.5 text-right">Total Jarak</th>
                      <th className="px-6 py-3.5">Keterangan Titik / Tempat</th>
                      <th className="px-6 py-3.5 text-right">Terakhir Survei</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentSummaries.map((s) => (
                      <tr key={s.storeName} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {s.storeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p>{s.storeName}</p>
                            <p className="text-[11px] font-normal text-slate-400">
                              {s.totalPhotos} foto dokumentasi
                            </p>
                          </div>
                        </td>

                        {/* Frekuensi Sebar Mailer */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800">
                            <Layers size={12} /> {s.mailerCount}x sebar
                          </span>
                        </td>

                        {/* Frekuensi Observasi */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800">
                            <Store size={12} /> {s.observasiCount}x
                          </span>
                        </td>

                        {/* Total Survei */}
                        <td className="px-4 py-4 text-center">
                          <span className="text-xs font-semibold text-slate-800">
                            {s.totalSurveys} kali
                          </span>
                        </td>

                        {/* Total Jarak */}
                        <td className="px-4 py-4 text-right font-medium text-slate-800">
                          {s.totalDistanceKm.toFixed(2)} km
                        </td>

                        {/* Status Titik / Tempat Berulang */}
                        <td className="px-6 py-4">
                          {s.hasOverlap ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle size={12} /> Ada Titik Berulang ({s.overlapCount}x)
                              </span>
                              <p className="text-[11px] text-amber-700">
                                {s.overlapRemarks[0] || "Terdapat koordinat yang sama antar survei"}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} /> Area Baru (Bebas Duplikasi)
                            </span>
                          )}
                        </td>

                        {/* Terakhir Survei */}
                        <td className="px-6 py-4 text-right text-xs text-slate-500">
                          {s.lastSurveyAt
                            ? new Date(s.lastSurveyAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DETEKSI TITIK / TEMPAT YANG SAMA (TUMPANG TINDIH) */}
      {activeTab === "titik-sama" && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
            <div className="space-y-1 text-xs text-amber-900">
              <h4 className="font-bold text-sm text-amber-950">
                Sistem Deteksi Titik / Tempat Sebar Berulang
              </h4>
              <p className="leading-relaxed">
                Fitur ini mendeteksi apabila toko yang sama melakukan sebar brosur atau survei di titik koordinat
                yang sama persis atau berjarak sangat dekat (&le; 150 meter) dari survei sebelumnya.
              </p>
              <p className="leading-relaxed text-amber-800 font-medium">
                💡 <em>Rekomendasi:</em> Arahkan tim lapangan menyasar klaster RT/RW atau ruas jalan lain agar
                jangkauan promosi lebih luas dan tidak berulang di titik yang sama.
              </p>
            </div>
          </div>

          {filteredOverlaps.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-800">
                Tidak Ada Titik Sebar Berulang
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Semua survei dan penyebaran mailer pada periode ini berjalan di area baru yang tidak tumpang tindih.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOverlaps.map((ov, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-amber-200/80 hover:border-amber-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        {ov.category === "identik" ? "Titik Identik (0 - 40m)" : "Area Sangat Dekat"}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5 flex items-center gap-1.5">
                        <Store size={14} className="text-slate-500" />
                        {ov.storeName}
                      </h4>
                    </div>

                    <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      Selisih: ±{ov.distanceMeters} meter
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400">Survei Utama:</span>
                        <p className="font-semibold text-slate-800">
                          Survei #{ov.routeId} ({ov.routeType === "mailer" ? "Sebar Mailer" : "Observasi"})
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(ov.routeDate).toLocaleDateString("id-ID")} • PIC: {ov.picName || "-"}
                        </p>
                      </div>
                      <Link
                        href={`/survey/${ov.routeId}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        Buka #{ov.routeId} <ChevronRight size={12} />
                      </Link>
                    </div>

                    <hr className="border-slate-200/60" />

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400">Titik yang Sama dengan:</span>
                        <p className="font-semibold text-slate-800">
                          Survei #{ov.otherRouteId} ({ov.otherRouteType === "mailer" ? "Sebar Mailer" : "Observasi"})
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(ov.otherRouteDate).toLocaleDateString("id-ID")} • PIC: {ov.otherPicName || "-"}
                        </p>
                      </div>
                      <Link
                        href={`/survey/${ov.otherRouteId}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        Buka #{ov.otherRouteId} <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-rose-500" /> Koordinat:{" "}
                      <code>{ov.lat.toFixed(5)}, {ov.lng.toFixed(5)}</code>
                    </span>
                    <span className="text-amber-700 font-medium">⚠️ Perlu Pemerataan</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DAFTAR RIWAYAT SELURUH RUTE */}
      {activeTab === "riwayat" && (
        <div className="space-y-4">
          {/* Filter Bar Pencarian */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari toko, PIC, atau catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Tipe */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
              >
                <option value="all">Semua Tipe</option>
                <option value="mailer">Sebar Mailer (Brosur)</option>
                <option value="observasi">Observasi</option>
              </select>

              {/* Filter Toko */}
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
              >
                <option value="all">Semua Toko</option>
                {storeOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {displayedRoutes.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
              <FileText size={36} className="mx-auto mb-2 text-slate-300" />
              <h3 className="text-sm font-semibold text-slate-700">Tidak ada rute yang cocok</h3>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter pencarian atau periode bulan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedRoutes.map((r) => {
                const overlaps = routeOverlapMap[r.id];
                const hasOverlap = overlaps && overlaps.length > 0;

                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-blue-200 transition-all block"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">{r.storeName}</h3>
                          <Badge
                            variant="default"
                            className={
                              r.type === "mailer"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-indigo-100 text-indigo-800"
                            }
                          >
                            {r.type === "mailer" ? "Sebar Mailer" : "Observasi"}
                          </Badge>
                          <Badge
                            variant={
                              r.status === "completed"
                                ? "success"
                                : r.status === "active"
                                ? "warning"
                                : "default"
                            }
                          >
                            {r.status === "completed" ? "Selesai" : r.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          PIC: <strong>{r.picName || "-"}</strong>
                          {r.notes && <span className="text-slate-400 ml-2 italic">• &quot;{r.notes}&quot;</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`/api/survey/${r.id}/report`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-all"
                          title="Unduh Laporan Word (.docx)"
                        >
                          <Download size={13} /> Word (.docx)
                        </a>

                        <Link
                          href={`/survey/${r.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
                        >
                          Lihat Detail & Peta <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>

                    {/* Badge Keterangan Titik Sama jika Ada */}
                    {hasOverlap && (
                      <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Keterangan Titik Sama: </strong>
                          {overlaps.map((ov, i) => (
                            <span key={i} className="inline-block mr-2">
                              Titik sama dengan <strong>Survei #{ov.otherRouteId}</strong> (
                              {new Date(ov.otherRouteDate).toLocaleDateString("id-ID")}, selisih ±{ov.distanceMeters}m).
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        {new Date(r.createdAt).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <RouteIcon size={13} className="text-emerald-500" />
                        {r.totalDistance ? `${(r.totalDistance / 1000).toFixed(2)} km` : "-"}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Camera size={13} className="text-blue-500" />
                        {r.photos ? `${r.photos.length} foto titik` : "0 foto"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
