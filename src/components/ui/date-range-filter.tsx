"use client";
import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";

interface Props {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
}

export default function DateRangeFilter({ startDate, endDate, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initialRange: DateRange | undefined = startDate && endDate
    ? { from: new Date(startDate + "T00:00:00"), to: new Date(endDate + "T00:00:00") }
    : undefined;
  const [range, setRange] = useState<DateRange | undefined>(initialRange);

  useEffect(() => {
    setRange(startDate && endDate
      ? { from: new Date(startDate + "T00:00:00"), to: new Date(endDate + "T00:00:00") }
      : undefined);
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setRange(startDate && endDate
          ? { from: new Date(startDate + "T00:00:00"), to: new Date(endDate + "T00:00:00") }
          : undefined);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [startDate, endDate]);

  const handleSelect = (r: DateRange | undefined) => {
    setRange(r);
  };

  const handleApply = () => {
    if (range?.from && range?.to) {
      onApply(format(range.from, "yyyy-MM-dd"), format(range.to, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  const handleReset = () => {
    setRange(undefined);
    onApply("", "");
    setOpen(false);
  };

  const displayText = startDate && endDate
    ? `${format(new Date(startDate + "T00:00:00"), "dd MMM yyyy")} - ${format(new Date(endDate + "T00:00:00"), "dd MMM yyyy")}`
    : "Semua Tanggal";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} type="button"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white hover:border-slate-300 transition-all whitespace-nowrap">
        <CalendarIcon size={14} className="text-slate-400" />
        <span className="text-slate-700">{displayText}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-3">
          <DayPicker mode="range" selected={range} onSelect={handleSelect} />
          <div className="flex gap-2 mt-3">
            <button onClick={handleReset}
              className="flex-1 text-center text-sm text-slate-500 hover:text-slate-700 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              Reset
            </button>
            <button onClick={handleApply}
              disabled={!range?.from || !range?.to}
              className="flex-1 text-center text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 py-1.5 rounded-lg transition-colors">
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
