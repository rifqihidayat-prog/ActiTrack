import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ className, children, hover }: { className?: string; children: ReactNode; hover?: boolean }) {
  return (
    <div className={cn("ga-card", hover && "hover:ga-card-hover transition-all duration-200", className)}>
      {children}
    </div>
  );
}
export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-6 py-4 border-b", className)} style={{ borderColor: "var(--ga-border)" }}>{children}</div>;
}
export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}
