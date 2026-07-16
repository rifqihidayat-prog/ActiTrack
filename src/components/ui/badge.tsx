import { cn } from "@/lib/utils";

const variantToColor: Record<string, string> = { success: "green", warning: "yellow", danger: "red", default: "gray", primary: "blue" };

const theme = {
  green: { bg: "var(--ga-green-bg)", text: "var(--ga-green)", dot: "var(--ga-green)" },
  yellow: { bg: "var(--ga-yellow-bg)", text: "#e37400", dot: "var(--ga-yellow)" },
  red: { bg: "var(--ga-red-bg)", text: "var(--ga-red)", dot: "var(--ga-red)" },
  gray: { bg: "#f1f3f4", text: "#5f6368", dot: "#9aa0a6" },
  blue: { bg: "var(--ga-blue-light)", text: "var(--ga-blue)", dot: "var(--ga-blue)" },
};

export function Badge({ children, className, color, variant }: { children: React.ReactNode; className?: string; color?: string; variant?: string }) {
  const resolved = color || variantToColor[variant || ""] || "gray";
  const t = theme[resolved as keyof typeof theme] || theme.gray;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", className)}
      style={{ background: t.bg, color: t.text, borderColor: "transparent" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
      {children}
    </span>
  );
}
