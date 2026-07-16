import { getCalendarEvents } from "@/lib/actions";
import CalendarView from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const events = await getCalendarEvents();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kalender Aktivasi</h1>
        <p className="text-sm text-slate-500 mt-1">Jadwal aktivasi toko berdasarkan tanggal</p>
      </div>
      <CalendarView events={events} />
    </div>
  );
}
