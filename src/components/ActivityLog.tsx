import { useState, useEffect, useCallback } from 'react';
import { fetchActivityLog, type ActivityEntry, type ActionType } from '@/lib/activity';
import {
  History,
  CalendarPlus,
  CreditCard,
  CheckCircle,
  Pencil,
  Tag,
  Trash2,
  ImageIcon,
  Loader2,
  Filter,
} from 'lucide-react';

interface ActivityLogProps {
  actorId?: string;
  maxHeight?: string;
}

const ACTION_ICONS: Record<ActionType, typeof History> = {
  manual_booking_created: CalendarPlus,
  payment_status_changed: CreditCard,
  booking_status_changed: CheckCircle,
  room_updated: Pencil,
  price_override_created: Tag,
  price_override_deleted: Tag,
  photo_uploaded: ImageIcon,
  photo_deleted: Trash2,
  booking_deleted: Trash2,
};

const ACTION_LABELS: Record<ActionType, string> = {
  manual_booking_created: 'Manual Booking',
  payment_status_changed: 'Payment Status',
  booking_status_changed: 'Booking Status',
  room_updated: 'Room Edit',
  price_override_created: 'Price Override',
  price_override_deleted: 'Price Override Removed',
  photo_uploaded: 'Photo Upload',
  photo_deleted: 'Photo Delete',
  booking_deleted: 'Booking Delete',
};

const ACTION_COLORS: Record<ActionType, string> = {
  manual_booking_created: 'text-blue-400 bg-blue-500/10',
  payment_status_changed: 'text-green-400 bg-green-500/10',
  booking_status_changed: 'text-green-400 bg-green-500/10',
  room_updated: 'text-amber-200 bg-amber-200/10',
  price_override_created: 'text-purple-300 bg-purple-500/10',
  price_override_deleted: 'text-red-400 bg-red-500/10',
  photo_uploaded: 'text-cyan-300 bg-cyan-500/10',
  photo_deleted: 'text-red-400 bg-red-500/10',
  booking_deleted: 'text-red-400 bg-red-500/10',
};

const FILTER_OPTIONS: { value: ActionType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'manual_booking_created', label: 'Manual Bookings' },
  { value: 'payment_status_changed', label: 'Payment Changes' },
  { value: 'booking_status_changed', label: 'Booking Changes' },
  { value: 'room_updated', label: 'Room Edits' },
  { value: 'price_override_created', label: 'Price Overrides' },
  { value: 'price_override_deleted', label: 'Price Override Deletes' },
  { value: 'photo_uploaded', label: 'Photo Uploads' },
  { value: 'photo_deleted', label: 'Photo Deletes' },
  { value: 'booking_deleted', label: 'Booking Deletes' },
];

export default function ActivityLog({ actorId, maxHeight = '600px' }: ActivityLogProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActionType | 'all'>('all');

  const fetch = useCallback(async () => {
    setLoading(true);
    const data = await fetchActivityLog(actorId);
    setEntries(data);
    setLoading(false);
  }, [actorId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.action_type === filter);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="rounded-sm border border-white/10 bg-[#22252a]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 font-heading text-base font-medium text-white">
          <History size={18} className="text-amber-200" />
          Activity Log
        </h3>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-white/30" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ActionType | 'all')}
            className="rounded-sm border border-white/10 bg-[#1e2125] px-3 py-1.5 text-xs text-white focus:border-amber-200/40 focus:outline-none"
          >
            {FILTER_OPTIONS.map((f) => (
              <option key={f.value} value={f.value} className="bg-[#22252a]">
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-12 text-sm text-white/40">
          <Loader2 size={16} className="animate-spin" />
          Loading activity...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-white/40">
          No activity recorded yet.
        </div>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight }}>
          <ul className="divide-y divide-white/5">
            {filtered.map((entry) => {
              const Icon = ACTION_ICONS[entry.action_type] || History;
              const colorClass = ACTION_COLORS[entry.action_type] || 'text-white/40 bg-white/5';
              return (
                <li key={entry.id} className="flex items-start gap-3 p-4 transition-colors hover:bg-white/[0.02]">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${colorClass}`}>
                        {ACTION_LABELS[entry.action_type]}
                      </span>
                      {!actorId && (
                        <span className="text-xs text-white/40">by {entry.actor_email}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-white/80">{entry.description}</p>
                    <p className="mt-0.5 text-xs text-white/30">{formatTime(entry.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
