"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
}
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", size = "md", children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
      {
        "text-white hover:opacity-90 shadow-sm": variant === "primary",
        "bg-white text-ga-text-secondary border border-ga-border hover:bg-gray-50": variant === "secondary",
        "text-ga-text-secondary hover:bg-gray-100": variant === "ghost",
        "text-white hover:opacity-90 shadow-sm": variant === "danger",
        "text-white hover:opacity-90 shadow-sm": variant === "success",
      },
      { "h-8 px-3 text-sm": size === "sm", "h-10 px-4 text-sm": size === "md", "h-12 px-6 text-base": size === "lg" },
      className
    )}
    style={{
      background: variant === "primary" ? "var(--ga-blue)" :
                 variant === "danger" ? "var(--ga-red)" :
                 variant === "success" ? "var(--ga-green)" : undefined
    }}
    {...props}
  >
    {children}
  </button>
));
Button.displayName = "Button";
export default Button;
