"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { LayoutDashboard, CalendarDays, ClipboardPlus, ClipboardCheck, Activity, MapIcon, Menu, X, ChevronLeft, BarChart3, TrendingUp, Users, LogOut, History } from "lucide-react";

const allNavItems = [
  { href: "/", label: "Dashboard", icon: BarChart3, adminOnly: false },
  { href: "/survey", label: "Survey & Tracking", icon: MapIcon, adminOnly: false },
  { href: "/realisasi", label: "Realisasi", icon: TrendingUp, adminOnly: false },
  { href: "/activity", label: "Riwayat", icon: History, adminOnly: false },
  { href: "/submissions/new", label: "Form Pengajuan", icon: ClipboardPlus, adminOnly: false },
  { href: "/calendar", label: "Kalender", icon: CalendarDays, adminOnly: false },
  { href: "/admin", label: "Approval", icon: ClipboardCheck, adminOnly: true },
  { href: "/admin/users", label: "Pengguna", icon: Users, adminOnly: true },
];

export default function Sidebar({ userRole, userName, pendingCount }: { userRole?: string; userName?: string; pendingCount?: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const navItems = allNavItems.filter(i => !i.adminOnly || userRole === "admin");

  return (
    <>
      <button onClick={() => setOpen(!open)} className={cn(
        "md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl shadow-lg hide-on-print",
        "bg-white text-ga-text-secondary hover:bg-ga-bg transition-colors"
      )}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={cn(
        "desktop-sidebar fixed left-0 top-0 h-full z-40 flex flex-col bg-white",
        "shadow-[2px_0_12px_rgba(0,0,0,0.06)] transition-transform duration-200",
        open ? "flex" : "hidden md:flex"
      )} style={{ width: "var(--ga-sidebar-width)" }}>
        <div className="px-6 h-16 flex items-center bg-[#f8f9fa]/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: "var(--ga-blue-light)" }}>
              <Activity size={18} className="text-ga-blue" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight" style={{ color: "var(--ga-text)" }}>ActiTrack</h1>
              <p className="text-[10px] font-medium" style={{ color: "var(--ga-text-muted)" }}>Aktivasi Toko</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ga-text-muted)" }}>Menu Utama</p>
          {navItems.map((item) => {
            const isActive = path === item.href || (item.href !== "/" && path.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "text-ga-blue"
                    : "hover:bg-gray-50 text-ga-text-secondary"
                )}
                style={isActive ? { background: "var(--ga-blue-light)" } : {}}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/admin" && pendingCount !== undefined && pendingCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-rose-500 min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">{pendingCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-[#f8f9fa]/40 mt-auto">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "var(--ga-blue)" }}>
              {(userName || "SA").charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: "var(--ga-text)" }}>{userName || "User"}</p>
              {userRole && <p className="text-xs truncate capitalize" style={{ color: "var(--ga-text-muted)" }}>{userRole}</p>}
            </div>
            <Link href="/login" className="p-1.5 text-slate-400 hover:text-ga-red transition-colors" title="Logout">
              <LogOut size={15} />
            </Link>
          </div>
        </div>
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-30 sidebar-overlay" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setOpen(false)} />
      )}
    </>
  );
}
