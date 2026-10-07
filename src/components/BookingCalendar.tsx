import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isDateBooked } from '@/lib/availability';

interface BookedRange {
  check_in: string;
  check_out: string;
  booking_status: string;
  guest_name: string;
}

interface BookingCalendarProps {
  roomName: string;
  bookedRanges: BookedRange[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function BookingCalendar({ roomName, bookedRanges }: BookingCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const simpleRanges = useMemo(
    () => bookedRanges.map((r) => ({ check_in: r.check_in, check_out: r.check_out })),
    [bookedRanges]
  );

  const goPrev = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday = 0
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(currentYear, currentMonth, d));
  }

  const todayStr = formatDate(today);

  const getBookingForDate = (dateStr: string): BookedRange | undefined => {
    return bookedRanges.find((r) => dateStr >= r.check_in && dateStr < r.check_out);
  };

  return (
    <div className="rounded-sm border border-white/10 bg-[#22252a] p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-medium text-white">{roomName}</h3>
          <p className="mt-0.5 text-xs text-white/40">
            {bookedRanges.length} active booking{bookedRanges.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium text-white">
            {MONTHS[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goNext}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="mt-6 grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium uppercase tracking-wide text-white/30">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dateStr = formatDate(date);
          const booked = isDateBooked(dateStr, simpleRanges);
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const booking = getBookingForDate(dateStr);

          return (
            <div
              key={dateStr}
              title={booking ? `Booked: ${booking.guest_name} (${booking.booking_status})` : undefined}
              className={`relative flex aspect-square items-center justify-center rounded-sm text-xs transition-colors ${
                booked
                  ? 'cursor-help bg-red-500/15 font-medium text-red-400'
                  : isPast
                    ? 'text-white/15'
                    : 'text-white/70 hover:bg-white/5'
              } ${isToday ? 'ring-1 ring-amber-200/40' : ''}`}
            >
              {date.getDate()}
              {booked && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 flex items-center gap-6 border-t border-white/5 pt-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-red-500/15" />
          <span className="text-xs text-white/40">Booked / Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm ring-1 ring-amber-200/40" />
          <span className="text-xs text-white/40">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-white/5" />
          <span className="text-xs text-white/40">Available</span>
        </div>
      </div>
    </div>
  );
}
