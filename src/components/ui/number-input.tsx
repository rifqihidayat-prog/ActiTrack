"use client";

export function unformat(value: string): number {
  return Number(value.replace(/\./g, "")) || 0;
}

export default function NumberInput({
  value,
  onChange,
  prefix,
  placeholder,
  className = "",
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  prefix?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const formatted = raw !== "" ? parseInt(raw, 10).toLocaleString("id-ID") : "";
    onChange(formatted);
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none z-10">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${prefix ? "pl-10" : ""} ${className}`}
      />
    </div>
  );
}
