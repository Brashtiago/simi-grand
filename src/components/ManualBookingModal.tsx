import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, AlertCircle, CalendarPlus } from 'lucide-react';
import type { Room } from '@/lib/rooms';
import { checkRoomAvailability } from '@/lib/availability';
import { fetchPriceOverrides, calculateStayPrice } from '@/lib/pricing';
import { logActivity } from '@/lib/activity';

interface Actor {
  id: string;
  email: string;
  role: string;
}

interface ManualBookingModalProps {
  rooms: Room[];
  actor: Actor | null;
  onClose: () => void;
  onCreated: () => void;
}

export default function ManualBookingModal({ rooms, actor, onClose, onCreated }: ManualBookingModalProps) {
  const [form, setForm] = useState({
    roomSlug: rooms[0]?.slug || '',
    checkIn: '',
    checkOut: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    numberOfRooms: '1',
    guests: '1',
    specialRequests: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedRoom = rooms.find((r) => r.slug === form.roomSlug);

  const handleSubmit = async () => {
    if (!form.roomSlug || !form.checkIn || !form.checkOut || !form.guestName || !form.guestEmail || !form.guestPhone) {
      setError('Please fill in all required fields.');
      return;
    }

    const checkIn = new Date(form.checkIn);
    const checkOut = new Date(form.checkOut);
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      setError('Check-out must be after check-in.');
      return;
    }

    if (!selectedRoom) {
      setError('Please select a room.');
      return;
    }

    const { available, overlappingBookings } = await checkRoomAvailability(
      form.roomSlug,
      form.checkIn,
      form.checkOut
    );

    if (!available) {
      setError(`Room is already booked for those dates (overlapping: ${overlappingBookings[0]?.booking_reference || 'unknown'}).`);
      return;
    }

    setSubmitting(true);
    setError('');

    const overrides = await fetchPriceOverrides(form.roomSlug);
    const { total } = calculateStayPrice(
      form.checkIn,
      form.checkOut,
      selectedRoom.price,
      overrides,
      parseInt(form.numberOfRooms)
    );

    const ref = `MAN-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const { error: insertError } = await supabase.from('bookings').insert({
      booking_reference: ref,
      room_id: form.roomSlug,
      room_name: selectedRoom.name,
      check_in: form.checkIn,
      check_out: form.checkOut,
      nights,
      number_of_rooms: parseInt(form.numberOfRooms),
      guests: parseInt(form.guests),
      guest_name: form.guestName,
      guest_email: form.guestEmail,
      guest_phone: form.guestPhone,
      guest_country: null,
      special_requests: form.specialRequests || null,
      total_price: total,
      payment_method: 'Pay at Checkout',
      payment_status: 'Offline',
      booking_status: 'Confirmed',
    });

    if (insertError) {
      setError(`Failed to create booking: ${insertError.message}`);
    } else {
      await logActivity(
        actor,
        'manual_booking_created',
        'booking',
        `Created manual booking ${ref} for ${form.guestName} (${selectedRoom.name}, ${form.checkIn} to ${form.checkOut})`,
        ref,
        { booking_reference: ref, room: selectedRoom.name, guest_name: form.guestName, check_in: form.checkIn, check_out: form.checkOut, total_price: total },
      );
      onCreated();
      onClose();
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-white/10 bg-[#22252a] p-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-heading text-lg font-medium text-white">
            <CalendarPlus size={20} className="text-amber-200" />
            Manual Booking
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-all hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs text-white/40">
          Create a booking for walk-in or offline guests. Dates are blocked immediately and payment status is set to "Offline".
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-sm bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/40">Room</label>
            <select
              value={form.roomSlug}
              onChange={(e) => setForm({ ...form, roomSlug: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white focus:border-amber-200/40 focus:outline-none"
            >
              {rooms.map((r) => (
                <option key={r.slug} value={r.slug}>{r.name} — ₹{r.price.toLocaleString('en-IN')}/night</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/40">Check-in</label>
              <input
                type="date"
                value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white focus:border-amber-200/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/40">Check-out</label>
              <input
                type="date"
                value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white focus:border-amber-200/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/40">Guest Name *</label>
              <input
                type="text"
                value={form.guestName}
                onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200/40 focus:outline-none"
                placeholder="Walk-in guest"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/40">Phone *</label>
              <input
                type="tel"
                value={form.guestPhone}
                onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200/40 focus:outline-none"
                placeholder="+91..."
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/40">Email *</label>
            <input
              type="email"
              value={form.guestEmail}
              onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200/40 focus:outline-none"
              placeholder="guest@example.com"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/40">Number of Rooms</label>
              <input
                type="number"
                min="1"
                value={form.numberOfRooms}
                onChange={(e) => setForm({ ...form, numberOfRooms: e.target.value })}
                className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white focus:border-amber-200/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/40">Guests</label>
              <input
                type="number"
                min="1"
                value={form.guests}
                onChange={(e) => setForm({ ...form, guests: e.target.value })}
                className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white focus:border-amber-200/40 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/40">Special Requests (optional)</label>
            <textarea
              value={form.specialRequests}
              onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
              rows={2}
              className="w-full rounded-sm border border-white/10 bg-[#1e2125] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200/40 focus:outline-none"
              placeholder="Early check-in, extra bed, etc."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-sm border border-white/10 px-5 py-2.5 text-sm text-white/60 transition-all hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-sm bg-amber-200/90 px-6 py-2.5 text-sm font-medium text-[#1A1C1E] transition-all hover:bg-amber-200 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CalendarPlus size={16} />
                Create Booking
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
