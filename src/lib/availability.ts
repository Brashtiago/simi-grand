import { supabase } from '@/lib/supabase';

export interface BookingOverlap {
  id: string;
  booking_reference: string;
  check_in: string;
  check_out: string;
  room_name: string;
}

/**
 * Checks whether a room is available for the given date range.
 * Overlap logic: two date ranges [start1, end1) and [start2, end2) overlap when
 * start1 < end2 AND start2 < end1. Check-out day is exclusive (guest leaving
 * on the same day another arrives is NOT an overlap).
 *
 * Only counts Confirmed and Pending bookings. Cancelled bookings are ignored.
 */
export async function checkRoomAvailability(
  roomSlug: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string
): Promise<{ available: boolean; overlappingBookings: BookingOverlap[] }> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, check_in, check_out, room_name')
    .eq('room_id', roomSlug)
    .in('booking_status', ['Confirmed', 'Pending'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn);

  if (error) {
    return { available: false, overlappingBookings: [] };
  }

  let overlapping = (data || []) as BookingOverlap[];

  if (excludeBookingId) {
    overlapping = overlapping.filter((b) => b.id !== excludeBookingId);
  }

  return {
    available: overlapping.length === 0,
    overlappingBookings: overlapping,
  };
}

/**
 * Fetches all booked date ranges for a given room, for calendar rendering.
 * Returns an array of { check_in, check_out, booking_status, guest_name }.
 */
export async function fetchRoomBookedDates(
  roomSlug: string
): Promise<{ check_in: string; check_out: string; booking_status: string; guest_name: string }[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('check_in, check_out, booking_status, guest_name')
    .eq('room_id', roomSlug)
    .in('booking_status', ['Confirmed', 'Pending'])
    .order('check_in', { ascending: true });

  if (error || !data) return [];
  return data as { check_in: string; check_out: string; booking_status: string; guest_name: string }[];
}

/**
 * Given a date and a list of booked ranges, determine if the date falls within
 * any booked range (inclusive of check_in, exclusive of check_out).
 */
export function isDateBooked(
  dateStr: string,
  bookedRanges: { check_in: string; check_out: string }[]
): boolean {
  return bookedRanges.some((range) => {
    return dateStr >= range.check_in && dateStr < range.check_out;
  });
}
