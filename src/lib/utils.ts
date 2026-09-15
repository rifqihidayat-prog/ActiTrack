import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "Approved": return "bg-emerald-500";
    case "Rejected": return "bg-rose-500";
    default: return "bg-amber-500";
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Rejected": return "bg-rose-50 text-rose-700 border-rose-200";
    default: return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

/**
 * Parsing tanggal UTC dengan aman, menormalisasi string SQLite YYYY-MM-DD HH:mm:ss
 * agar tidak salah dibaca sebagai waktu lokal WIB (mencegah selisih 7 jam).
 */
export function parseUtcDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  let str = String(d).trim();
  if (!str.endsWith("Z") && !str.includes("+") && !str.slice(10).includes("-")) {
    str = str.replace(" ", "T") + "Z";
  }
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format durasi milidetik ke teks Indonesia (jam & menit)
 */
export function formatDurationMs(durationMs: number): string {
  const safeMs = Math.max(0, durationMs);
  const durationMin = Math.floor(safeMs / 60000);
  if (durationMin >= 60) {
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
  }
  return `${Math.max(1, durationMin)} menit`;
}

