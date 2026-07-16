"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, MapIcon, ClipboardPlus, ClipboardCheck, TrendingUp, History } from "lucide-react";

const allItems = [
  { href: "/", label: "Dashboard", icon: BarChart3, adminOnly: false },
  { href: "/survey", label: "Survey", icon: MapIcon, adminOnly: false },
  { href: "/activity", label: "Riwayat", icon: History, adminOnly: false },
  { href: "/realisasi", label: "Realisasi", icon: TrendingUp, adminOnly: false },
  { href: "/submissions/new", label: "Buat", icon: ClipboardPlus, adminOnly: false },
  { href: "/admin", label: "Approval", icon: ClipboardCheck, adminOnly: true },
];

export default function BottomNav({ userRole, pendingCount }: { userRole?: string; pendingCount?: number }) {
  const path = usePathname();
  const items = allItems.filter(i => !i.adminOnly || userRole === "admin");

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)] safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const isActive = path === item.href || (item.href !== "/" && path.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`bottom-nav-link ${isActive ? "active" : "inactive"}`}>
              <div className="relative">
                <item.icon size={20} />
                {item.href === "/admin" && pendingCount !== undefined && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 text-[9px] font-bold text-white bg-rose-500 min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-0.5">{pendingCount}</span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
