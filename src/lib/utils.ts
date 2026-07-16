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
