"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createSurveyRoute,
  updateSurveyRoute,
  saveWaypoints,
  saveSurveyPhoto,
  getSurveyLocationSummary,
  sendSurveyReportEmail,
  getStoreCoordinateByName,
  saveStoreCoordinate,
  getAllStoresWithCoordinates,
} from "@/lib/actions";
import { haversine } from "@/lib/gps";
import SurveyMap from "./survey-map";
import WhatsAppReportButton from "./whatsapp-report-button";
import Button from "@/components/ui/button";
import {
  Camera,
  Play,
  Square,
  Clock,
  Route,
  Navigation,
  MapPin,
  Store,
  User,
  Download,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Send,
  Loader2,
  RefreshCw,
  Smartphone,
  Laptop,
  LocateFixed,
  History,
} from "lucide-react";

type Waypoint = { lat: number; lng: number; accuracy: number; timestamp: string };
type Photo = { lat: number; lng: number; photoData: string; caption: string };
type LatLng = { lat: number; lng: number };

interface LocationSummary {
  kelurahan: string;
  kecamatan: string;
  city: string;
  coverageMessage: string;
  isWithinCoverage: boolean;
}

function compressImage(file: File, maxDim = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file foto"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memproses gambar"));
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function SurveyTracker({
  userStoreName,
  userName,
}: {
  userStoreName?: string;
  userName?: string;
}) {
  const router = useRouter();

  // State Form Inisiasi
  const [form, setForm] = useState({
    storeName: userStoreName || "",
    picName: userName || "",
    type: "observasi",
  });

  // Tracking States
  const [tracking, setTracking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [livePoints, setLivePoints] = useState<LatLng[]>([]);
  const [lastPos, setLastPos] = useState<LatLng | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Summary / Finished States
  const [locationSummary, setLocationSummary] = useState<LocationSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [finalDurationStr, setFinalDurationStr] = useState("");
  const [finalDistanceKm, setFinalDistanceKm] = useState("0");

  // Email Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [managerEmail, setManagerEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Store Coordinate States
  const [storeCoord, setStoreCoord] = useState<{ lat: number; lng: number; radiusKm?: number } | null>(null);
  const [checkingStoreCoord, setCheckingStoreCoord] = useState(false);
  const [savingCoord, setSavingCoord] = useState(false);
  const [saveCoordMessage, setSaveCoordMessage] = useState<string | null>(null);
  const [suggestedStores, setSuggestedStores] = useState<string[]>([]);

  // Mobile Device Guard States (Khusus Akses Mobile/HP)
  const [isDesktop, setIsDesktop] = useState(false);
  const [bypassDesktopGuard, setBypassDesktopGuard] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // Muat daftar rekomendasi toko
  useEffect(() => {
    getAllStoresWithCoordinates()
      .then((list) => {
        setSuggestedStores(list.map((s) => s.name));
      })
      .catch(() => {});
  }, []);

  // Cek koordinat acuan toko setiap nama toko berubah
  useEffect(() => {
    const query = form.storeName.trim();
    if (!query) {
      setStoreCoord(null);
      return;
    }
    let cancelled = false;
    setCheckingStoreCoord(true);
    getStoreCoordinateByName(query)
      .then((coord) => {
        if (!cancelled) {
          if (coord) {
            setStoreCoord({ lat: coord.lat, lng: coord.lng, radiusKm: coord.coverageRadiusKm });
          } else {
            setStoreCoord(null);
          }
          setCheckingStoreCoord(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCheckingStoreCoord(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.storeName]);

  const handleSaveCurrentLocationAsStore = () => {
    if (!form.storeName.trim()) {
      alert("Silakan masukkan nama toko cabang terlebih dahulu.");
      return;
    }
    if (!navigator.geolocation) {
      alert("Perangkat Anda tidak mendukung fitur lokasi GPS.");
      return;
    }
    setSavingCoord(true);
    setSaveCoordMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await saveStoreCoordinate(form.storeName, lat, lng, 5.0);
          if (res.success) {
            setStoreCoord({ lat, lng, radiusKm: 5.0 });
            setSaveCoordMessage("Titik koordinat toko berhasil disimpan!");
            setTimeout(() => setSaveCoordMessage(null), 3500);
          } else {
            alert(res.message);
          }
        } catch (err: any) {
          alert("Gagal menyimpan titik koordinat toko: " + (err?.message || "Kesalahan"));
        } finally {
          setSavingCoord(false);
        }
      },
      (err) => {
        setSavingCoord(false);
        alert("Gagal membaca GPS: Pastikan izin lokasi HP Anda aktif.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Refs
  const waypointsRef = useRef<Waypoint[]>([]);
  const savedCountRef = useRef(0);
  const routeIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<LatLng | null>(null);
  const lastTimeRef = useRef(0);
  const distanceRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const timerRef = useRef<any>(null);
  const saveTimerRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sinkronisasi data waypoint ke server
  const persistPending = async () => {
    const id = routeIdRef.current;
    if (!id) return;
    const pending = waypointsRef.current.slice(savedCountRef.current);
    if (pending.length === 0) return;
    try {
      await saveWaypoints(id, pending);
      savedCountRef.current = waypointsRef.current.length;
    } catch (e) {
      console.error("Gagal sinkronisasi waypoint:", e);
    }
  };
  const persistPendingRef = useRef(persistPending);
  persistPendingRef.current = persistPending;

  useEffect(() => {
    const flush = () => {
      persistPendingRef.current();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);

  // Format Waktu Stopwatch (HH:MM:SS atau MM:SS)
  const formatStopwatch = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatTextDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) {
      return `${h} Jam ${m} Menit`;
    }
    return `${Math.max(1, m)} Menit`;
  };

  // Mulai Tracking GPS
  const startTracking = async () => {
    if (!form.storeName) return;
    try {
      const nowIso = new Date().toISOString();
      const id = await createSurveyRoute({ ...form, startTime: nowIso });
      setRouteId(id);
      routeIdRef.current = id;
      setTracking(true);
      setFinished(false);
      startTimeRef.current = Date.now();

      // GPS Watcher
      if ("geolocation" in navigator) {
        const wid = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;
            const now = Date.now();

            setCurrentAccuracy(Math.round(acc));
            if (acc > 40) return; // Singkirkan akurasi buruk

            if (!lastPosRef.current) {
              lastPosRef.current = { lat, lng };
              lastTimeRef.current = now;
              lastSaveTimeRef.current = now;
              const wp: Waypoint = { lat, lng, accuracy: acc, timestamp: new Date(now).toISOString() };
              waypointsRef.current.push(wp);
              setLivePoints([{ lat, lng }]);
              setLastPos({ lat, lng });
              return;
            }

            const prev = lastPosRef.current;
            const alpha = 0.4;
            const sm: LatLng = { lat: prev.lat + alpha * (lat - prev.lat), lng: prev.lng + alpha * (lng - prev.lng) };
            const d = haversine(prev.lat, prev.lng, sm.lat, sm.lng);
            const dt = Math.max(1, (now - lastTimeRef.current) / 1000);
            lastTimeRef.current = now;

            // Singkirkan lonjakan tidak masuk akal (teleport/kecepatan > 43 km/jam)
            if (d > 400 || d / dt > 12) return;

            distanceRef.current += d;
            setDistance(distanceRef.current);
            lastPosRef.current = sm;
            setLastPos(sm);

            // Simpan setiap perpindahan >= 3 meter atau minimal per 3 detik
            if (d >= 3 || now - lastSaveTimeRef.current >= 3000) {
              const wp: Waypoint = { ...sm, accuracy: acc, timestamp: new Date(now).toISOString() };
              waypointsRef.current.push(wp);
              lastSaveTimeRef.current = now;
              setLivePoints((p) => [...p, sm]);
            }
          },
          (err) => console.error("GPS Error:", err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
        setWatchId(wid);
      }

      // Timer Stopwatch (Detik per Detik)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Auto-save waypoint ke server per 10 detik
      saveTimerRef.current = setInterval(() => {
        persistPendingRef.current();
      }, 10000);
    } catch (e: any) {
      alert("Gagal memulai survey: " + (e?.message || "Kesalahan jaringan"));
    }
  };

  // Selesai Tracking
  const stopTracking = async () => {
    if (uploadingPhoto) {
      alert("Sedang mengompres dan menyimpan foto terakhir ke database, mohon tunggu sebentar...");
      return;
    }
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (timerRef.current) clearInterval(timerRef.current);
    if (saveTimerRef.current) clearInterval(saveTimerRef.current);

    const finalDur = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const finalDist = distanceRef.current;
    setFinalDurationStr(formatTextDuration(finalDur));
    setFinalDistanceKm((finalDist / 1000).toFixed(2));

    setTracking(false);
    setFinished(true);

    if (routeId) {
      try {
        await persistPending();
        await updateSurveyRoute(routeId, {
          endTime: new Date().toISOString(),
          totalDistance: finalDist,
          status: "completed",
        });
      } catch (e) {
        console.error("Gagal menyelesaikan rute survey:", e);
      }

      // Ambil Geocoding Alamat Kelurahan & Kecamatan dari titik awal
      const firstWp = waypointsRef.current[0] || lastPosRef.current;
      if (firstWp) {
        setLoadingSummary(true);
        try {
          const res = await getSurveyLocationSummary(firstWp.lat, firstWp.lng, form.storeName);
          setLocationSummary({
            kelurahan: res.address.kelurahan,
            kecamatan: res.address.kecamatan,
            city: res.address.city,
            coverageMessage: res.coverage.message,
            isWithinCoverage: res.coverage.isWithinCoverage,
          });
        } catch (err) {
          console.error("Gagal mendapatkan ringkasan lokasi:", err);
        } finally {
          setLoadingSummary(false);
        }
      }
    }
  };

  // Ambil Foto Lapangan
  const takePhoto = () => fileRef.current?.click();

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !routeId) return;

    // Gunakan posisi GPS terakhir saat foto dijepret (atau titik GPS terakhir yang valid)
    const pos =
      lastPosRef.current ||
      (waypointsRef.current.length > 0 ? waypointsRef.current[waypointsRef.current.length - 1] : null) ||
      { lat: -6.2, lng: 106.8 };

    setUploadingPhoto(true);

    try {
      // Kompresi di browser (mengurangi ukuran smartphone dari ~10MB ke ~100KB)
      const photoData = await compressImage(file);
      const photoIndex = photos.length + 1;
      const photo: Photo = {
        lat: pos.lat,
        lng: pos.lng,
        photoData,
        caption: `Foto #${photoIndex}`,
      };

      setPhotos((p) => [...p, photo]);
      const res = await saveSurveyPhoto(routeId, photo);
      if (!res?.success) {
        throw new Error("Gagal menyimpan foto ke server");
      }
    } catch (err: any) {
      console.error("Gagal simpan foto:", err);
      alert("Gagal mengunggah foto: " + (err?.message || "Kesalahan jaringan / ukuran file"));
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  // Kirim Laporan ke Email Atasan
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeId || !managerEmail) return;

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await sendSurveyReportEmail(routeId, managerEmail);
      if (res.success) {
        setEmailStatus({ type: "success", message: res.message });
        setTimeout(() => setIsEmailModalOpen(false), 2000);
      } else {
        setEmailStatus({ type: "error", message: res.message });
      }
    } catch (err: any) {
      setEmailStatus({
        type: "error",
        message: err?.message || "Gagal mengirimkan email ke atasan.",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // ==========================================
  // VIEW GUARD: Khusus Mobile / Smartphone
  // ==========================================
  if (isDesktop && !bypassDesktopGuard) {
    return (
      <div className="max-w-md mx-auto py-6 px-3">
        <div className="bg-white rounded-3xl p-7 text-center shadow-lg border border-slate-100 space-y-5">
          <div className="relative w-18 h-18 mx-auto flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Smartphone size={32} />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-200">
              <Smartphone size={12} /> Khusus Akses Smartphone / HP
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">Buka di Smartphone Anda</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Fitur <strong>Survey & Tracking Lapangan</strong> dirancang khusus untuk perangkat HP karena membutuhkan sensor GPS aktif dan kamera saat bergerak di rute observasi.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <ShieldCheck size={16} className="text-emerald-600" />
              Fitur Khusus HP:
            </div>
            <ul className="text-[11px] text-slate-500 space-y-1.5 pl-5 list-disc">
              <li>Perekaman rute GPS real-time (langkah kaki / kendaraan)</li>
              <li>Pengambilan foto dokumentasi lapangan dengan kamera HP</li>
              <li>Deteksi otomatis coverage toko 5 km di 4 penjuru mata angin</li>
            </ul>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => router.push("/survey")}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <History size={16} />
              Buka Riwayat Survey (Laptop & PC)
            </button>

            <button
              onClick={() => setBypassDesktopGuard(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Laptop size={14} />
              Lanjutkan di Laptop (Mode Pratinjau Mobile)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: Form Awal Sebelum Mulai (Mobile Ready)
  // ==========================================
  if (!tracking && !finished) {
    return (
      <div className="max-w-md mx-auto px-2 sm:px-0 space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Navigation size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Mulai Survey & Tracking</h2>
              <p className="text-xs text-slate-500">Rekam jalur rute GPS dan dokumentasi foto</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                <MapPin size={14} className="text-blue-600" /> Tipe Aktivitas
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all"
              >
                <option value="observasi">Observasi / Pengenalan Toko</option>
                <option value="mailer">Sebar Mailer / Brosur</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                <Store size={14} className="text-blue-600" /> Toko Cabang
              </label>
              <input
                list="store-suggestions"
                value={form.storeName}
                onChange={(e) => setForm((p) => ({ ...p, storeName: e.target.value }))}
                placeholder="Pilih atau ketik nama toko cabang..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
              <datalist id="store-suggestions">
                {suggestedStores.map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>

              {/* Status & Pengaturan Titik Koordinat Toko oleh Pengguna */}
              {form.storeName.trim().length > 1 && (
                <div className="mt-2 text-xs">
                  {checkingStoreCoord ? (
                    <div className="flex items-center gap-1.5 text-slate-400 py-1">
                      <Loader2 size={13} className="animate-spin text-blue-500" />
                      <span>Memeriksa titik koordinat toko...</span>
                    </div>
                  ) : storeCoord ? (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          <span>Titik Toko Terdaftar</span>
                        </div>
                        <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                          Radius 5 km
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-mono">
                        {storeCoord.lat.toFixed(5)}, {storeCoord.lng.toFixed(5)}
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveCurrentLocationAsStore}
                        disabled={savingCoord}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100/50 flex items-center justify-center gap-1.5 transition-all active:scale-98"
                      >
                        {savingCoord ? (
                          <>
                            <Loader2 size={12} className="animate-spin" /> Mengambil GPS...
                          </>
                        ) : (
                          <>
                            <LocateFixed size={12} /> Perbarui Titik dari GPS Saya Sekarang
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl space-y-2">
                      <div className="flex items-start gap-1.5 text-amber-800 font-medium text-[11px] leading-tight">
                        <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>
                          Titik koordinat acuan untuk &quot;{form.storeName}&quot; belum terdaftar. Simpan lokasi toko agar radar coverage 5 km aktif.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveCurrentLocationAsStore}
                        disabled={savingCoord}
                        className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-98"
                      >
                        {savingCoord ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Menyimpan GPS Toko...
                          </>
                        ) : (
                          <>
                            <MapPin size={13} /> Set Titik Toko dari GPS Saya Sekarang
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {saveCoordMessage && (
                    <div className="mt-1.5 text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                      <CheckCircle2 size={13} /> {saveCoordMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                <User size={14} className="text-blue-600" /> Nama Petugas / Tim Lapangan
              </label>
              <input
                value={form.picName}
                onChange={(e) => setForm((p) => ({ ...p, picName: e.target.value }))}
                placeholder="Nama PIC survey"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={startTracking}
              disabled={!form.storeName}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
            >
              <Play size={20} fill="white" />
              Mulai Tracking Lapangan
            </button>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <span>Pastikan GPS/Lokasi pada smartphone Anda dalam keadaan aktif dengan mode Akurasi Tinggi.</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: Layar Tracking Sedang Aktif (Mobile-First Experience)
  // ==========================================
  if (tracking) {
    return (
      <div className="max-w-md mx-auto space-y-3 pb-24">
        {/* Header Bar: Toko & Indikator GPS */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Tracking Berjalan</span>
            </div>
            <h3 className="font-bold text-slate-800 text-sm mt-0.5">{form.storeName}</h3>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Akurasi GPS</div>
            <div className="text-xs font-semibold text-slate-600">
              {currentAccuracy ? `±${currentAccuracy}m` : "Mencari sinyal..."}
            </div>
          </div>
        </div>

        {/* Dashboard Stopwatch & Jarak Berjalan Real-Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl p-4 shadow-sm text-center">
            <div className="flex items-center justify-center gap-1 text-blue-100 text-xs mb-1">
              <Clock size={14} /> Durasi Aktif
            </div>
            <div className="text-3xl font-extrabold font-mono tracking-tight">{formatStopwatch(elapsed)}</div>
            <div className="text-[10px] text-blue-200 mt-1">Berjalan real-time</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-2xl p-4 shadow-sm text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-100 text-xs mb-1">
              <Route size={14} /> Jarak Tempuh
            </div>
            <div className="text-3xl font-extrabold font-mono tracking-tight">
              {(distance / 1000).toFixed(2)}
              <span className="text-base font-normal ml-1">km</span>
            </div>
            <div className="text-[10px] text-emerald-200 mt-1">Mengikuti langkah kaki</div>
          </div>
        </div>

        {/* Peta Tracking Live dengan Marker Foto Real-Time */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin size={14} className="text-blue-600" /> Peta Jejak Rute
            </span>
            <span className="text-[11px] text-slate-400">{livePoints.length} titik waypoint tercatat</span>
          </div>

          <div className="h-[280px] rounded-xl overflow-hidden border border-slate-100 relative">
            <LiveTrackerMap points={livePoints} photos={photos} currentPos={lastPos} />
          </div>
        </div>

        {/* Galeri Thumbnail Foto yang Diambil */}
        {photos.length > 0 && (
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera size={14} className="text-rose-500" /> Bukti Foto Terkumpul
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
                {photos.length} Foto
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {photos.map((p, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img
                    src={p.photoData}
                    alt={`Foto ${i + 1}`}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                  />
                  <span className="absolute top-1 left-1 bg-red-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifikasi Upload Foto Berjalan */}
        {uploadingPhoto && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-xs font-semibold backdrop-blur-md border border-slate-700 animate-pulse">
            <Loader2 size={16} className="animate-spin text-rose-400" />
            <span>Mengompres & menyimpan foto...</span>
          </div>
        )}

        {/* Floating Bottom Action Bar (Ramah Satu Tangan di HP) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-30">
          <div className="max-w-md mx-auto flex gap-3">
            <button
              onClick={takePhoto}
              disabled={uploadingPhoto}
              className="flex-1 py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-sm shadow flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {uploadingPhoto ? (
                <>
                  <Loader2 size={18} className="animate-spin text-rose-400" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Camera size={18} className="text-rose-400" />
                  Ambil Foto ({photos.length})
                </>
              )}
            </button>

            <button
              onClick={stopTracking}
              disabled={uploadingPhoto}
              className="flex-1 py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm shadow flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <Square size={18} fill="white" />
              Selesai Tracking
            </button>
          </div>
        </div>

        {/* Input Kamera Asli Smartphone */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
      </div>
    );
  }

  // ==========================================
  // VIEW 3: Layar Preview Instan Pasca Selesai (Requirement 2 Sempurna)
  // ==========================================
  return (
    <div className="max-w-md mx-auto space-y-4 pb-12">
      {/* Banner Selesai */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center space-y-2">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-1">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800">Survey & Tracking Selesai!</h2>
        <p className="text-xs text-slate-500">
          Aktivitas <strong>{form.storeName}</strong> oleh <strong>{form.picName || "Petugas"}</strong> telah berhasil
          direkam.
        </p>
      </div>

      {/* Tiga Metrik Utama: Durasi, Jarak, Titik Foto */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <Clock size={18} className="mx-auto text-blue-600 mb-1" />
          <div className="text-xs text-slate-400 font-medium">Durasi</div>
          <div className="text-base font-bold text-slate-800 mt-0.5">{finalDurationStr || `${Math.floor(elapsed / 60)} Menit`}</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <Route size={18} className="mx-auto text-emerald-600 mb-1" />
          <div className="text-xs text-slate-400 font-medium">Jarak</div>
          <div className="text-base font-bold text-slate-800 mt-0.5">{finalDistanceKm} km</div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
          <Camera size={18} className="mx-auto text-rose-500 mb-1" />
          <div className="text-xs text-slate-400 font-medium">Titik Foto</div>
          <div className="text-base font-bold text-slate-800 mt-0.5">{photos.length} Titik</div>
        </div>
      </div>

      {/* Informasi Wilayah & Area Cakupan Toko */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <MapPin size={16} className="text-indigo-600" />
          Area Administratif & Coverage Toko
        </div>

        {loadingSummary ? (
          <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 size={16} className="animate-spin text-blue-600" />
            Membaca alamat kelurahan & kecamatan...
          </div>
        ) : locationSummary ? (
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Kelurahan:</span>
              <span className="font-bold text-slate-800">{locationSummary.kelurahan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kecamatan:</span>
              <span className="font-bold text-slate-800">{locationSummary.kecamatan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kota:</span>
              <span className="font-medium text-slate-700">{locationSummary.city}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-500">Status Radius:</span>
              <span
                className={`font-bold inline-flex items-center gap-1 ${
                  locationSummary.isWithinCoverage ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                <ShieldCheck size={14} />
                {locationSummary.coverageMessage}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">Data administratif sedang diproses...</div>
        )}
      </div>

      {/* Visualisasi Rute Strava-Like Lengkap dengan Titik Foto */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Route size={14} className="text-orange-500" /> Rute Perjalanan (Strava Style)
          </span>
          <span className="text-[11px] text-slate-400">Garis jalan & titik foto</span>
        </div>

        <div className="h-[280px] rounded-xl overflow-hidden border border-slate-100">
          <SurveyMap waypoints={waypointsRef.current} photos={photos} className="w-full h-full" />
        </div>
      </div>

      {/* Tombol Aksi Utama: Download Laporan & Kirim Email Atasan */}
      <div className="space-y-2 pt-2">
        {routeId && (
          <a
            href={`/api/survey/${routeId}/report`}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow flex items-center justify-center gap-2 transition-all"
          >
            <Download size={18} />
            Download Laporan Lengkap (.docx)
          </a>
        )}

        {routeId && (
          <WhatsAppReportButton
            route={{
              id: routeId,
              storeName: form.storeName,
              picName: form.picName,
              type: form.type,
              totalDistance: distance,
            }}
            summaryInfo={{
              durationStr: finalDurationStr || `${Math.floor(elapsed / 60)} Menit`,
              photoCount: photos.length,
              kelurahan: locationSummary?.kelurahan,
              kecamatan: locationSummary?.kecamatan,
              city: locationSummary?.city,
              coverageMessage: locationSummary?.coverageMessage,
            }}
            className="w-full py-3.5"
          />
        )}

        <button
          onClick={() => setIsEmailModalOpen(true)}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow flex items-center justify-center gap-2 transition-all"
        >
          <Mail size={18} />
          Kirim Hasil ke Email Atasan
        </button>

        <button
          onClick={() => router.push("/survey")}
          className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <ArrowLeft size={14} />
          Kembali ke Daftar Riwayat Survey
        </button>
      </div>

      {/* Modal Kirim Email ke Atasan */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Mail size={18} className="text-emerald-600" />
                Kirim Laporan ke Atasan
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Laporan Word (.docx) lengkap dengan peta rute dan bukti dokumentasi foto akan langsung dilampirkan ke email atasan.
            </p>

            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Alamat Email Atasan</label>
                <input
                  type="email"
                  required
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="manager@perusahaan.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              {emailStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    emailStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                      : "bg-red-50 text-red-800 border border-red-100"
                  }`}
                >
                  {emailStatus.type === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{emailStatus.message}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail || !managerEmail}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Kirimkan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Sub-Komponen: Peta Live Tracker Saat Berjalan
// ==========================================
function LiveTrackerMap({
  points,
  photos,
  currentPos,
}: {
  points: LatLng[];
  photos: Photo[];
  currentPos: LatLng | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const Lref = useRef<any>(null);
  const mapInstance = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const photoMarkersGroupRef = useRef<any>(null);

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (mapInstance.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !mapRef.current) return;

      Lref.current = L;
      const initialView: [number, number] = currentPos ? [currentPos.lat, currentPos.lng] : [-6.2, 106.8];

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(initialView, 17);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Layer Grup untuk Marker Foto
      const photoGroup = L.layerGroup().addTo(map);
      photoMarkersGroupRef.current = photoGroup;

      mapInstance.current = map;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Update Garis Rute Berjalan (Antarmuka polyline dinamis)
  useEffect(() => {
    const map = mapInstance.current;
    const L = Lref.current;
    if (!map || !L || points.length === 0) return;

    const latLngs = points.map((p) => [p.lat, p.lng]);

    if (!polylineRef.current) {
      polylineRef.current = L.polyline(latLngs, {
        color: "#fc5200", // Strava Orange
        weight: 5,
        opacity: 0.9,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);
    } else {
      polylineRef.current.setLatLngs(latLngs);
    }
  }, [points]);

  // Update Posisi Pengguna (Pulsing Dot) & Auto Pan
  useEffect(() => {
    const map = mapInstance.current;
    const L = Lref.current;
    if (!map || !L || !currentPos) return;

    const userHtml = `
      <div style="position:relative;width:20px;height:20px;">
        <div style="position:absolute;inset:0;background:#0284c7;border-radius:50%;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;inset:2px;background:#0284c7;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userHtml,
      className: "",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([currentPos.lat, currentPos.lng], { icon: userIcon }).addTo(map);
      map.setView([currentPos.lat, currentPos.lng], 17);
    } else {
      userMarkerRef.current.setLatLng([currentPos.lat, currentPos.lng]);
      map.panTo([currentPos.lat, currentPos.lng]);
    }
  }, [currentPos]);

  // Update Pin Titik Foto di Peta Live
  useEffect(() => {
    const L = Lref.current;
    const group = photoMarkersGroupRef.current;
    if (!L || !group) return;

    group.clearLayers();

    photos.forEach((p, idx) => {
      const photoNum = idx + 1;
      const photoIcon = L.divIcon({
        html: `
          <div style="background:#dc2626;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:10px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            ${photoNum}
          </div>
        `,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([p.lat, p.lng], { icon: photoIcon }).addTo(group);
    });
  }, [photos]);

  return <div ref={mapRef} className="w-full h-full" />;
}