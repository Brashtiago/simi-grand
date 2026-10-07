import { supabase } from '@/lib/supabase';

export interface PriceOverride {
  id: string;
  room_slug: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  label: string | null;
  created_at: string;
}

/**
 * Fetches all price overrides for a given room.
 */
export async function fetchPriceOverrides(roomSlug: string): Promise<PriceOverride[]> {
  const { data, error } = await supabase
    .from('room_price_overrides')
    .select('*')
    .eq('room_slug', roomSlug)
    .order('start_date', { ascending: true });

  if (error || !data) return [];
  return data as PriceOverride[];
}

/**
 * Fetches all price overrides for all rooms in a single query.
 */
export async function fetchAllPriceOverrides(): Promise<PriceOverride[]> {
  const { data, error } = await supabase
    .from('room_price_overrides')
    .select('*')
    .order('start_date', { ascending: true });

  if (error || !data) return [];
  return data as PriceOverride[];
}

/**
 * Given a date string (YYYY-MM-DD), checks if it falls within any override range.
 * end_date is inclusive.
 */
function findOverrideForDate(
  dateStr: string,
  overrides: PriceOverride[]
): PriceOverride | null {
  for (const override of overrides) {
    if (dateStr >= override.start_date && dateStr <= override.end_date) {
      return override;
    }
  }
  return null;
}

/**
 * Calculates the total price for a stay, applying per-night override prices
 * when a night falls within an override range.
 *
 * Returns both the total and a per-night breakdown so the UI can show
 * which nights have custom pricing.
 */
export function isOctober2026(dateStr: string): boolean {
  return dateStr >= '2026-10-01' && dateStr <= '2026-10-31';
}

export function stayQualifiesForOctDiscount(checkIn: string, checkOut: string): boolean {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const cursor = new Date(start);
  while (cursor < end) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (isOctober2026(dateStr)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

export function calculateStayPrice(
  checkIn: string,
  checkOut: string,
  defaultPrice: number,
  overrides: PriceOverride[],
  numberOfRooms: number = 1
): {
  total: number;
  nightlyBreakdown: { date: string; price: number; overridden: boolean }[];
  subtotal: number;
  discountAmount: number;
  discountApplied: boolean;
} {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nightlyBreakdown: { date: string; price: number; overridden: boolean }[] = [];
  let subtotal = 0;

  const cursor = new Date(start);
  while (cursor < end) {
    const dateStr = cursor.toISOString().split('T')[0];
    const override = findOverrideForDate(dateStr, overrides);
    const nightPrice = override ? Number(override.price_per_night) : defaultPrice;
    subtotal += nightPrice * numberOfRooms;
    nightlyBreakdown.push({
      date: dateStr,
      price: nightPrice,
      overridden: !!override,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const discountApplied = stayQualifiesForOctDiscount(checkIn, checkOut);
  const discountAmount = discountApplied ? Math.round(subtotal * 0.2) : 0;
  const total = subtotal - discountAmount;

  return { total, nightlyBreakdown, subtotal, discountAmount, discountApplied };
}
