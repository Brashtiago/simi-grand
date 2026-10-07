import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, localizeMediaUrl } from '@/lib/supabase';

export interface Room {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  weekendPrice: number;
  seasonalPrice: number;
  capacity: number;
  bedType: string;
  roomSize: string;
  viewType: string;
  amenities: string[];
  images: string[];
  totalRooms: number;
}

interface RoomsContextType {
  rooms: Room[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const RoomsContext = createContext<RoomsContextType>({
  rooms: [],
  loading: false,
  refresh: async () => {},
});

export function RoomsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      // Fetch photos for all rooms in one query
      const slugs = data.map((r: Record<string, unknown>) => r.slug as string);
      const { data: photos } = await supabase
        .from('room_photos')
        .select('room_slug, photo_url, sort_order')
        .in('room_slug', slugs)
        .order('sort_order', { ascending: true });

      const photosBySlug: Record<string, string[]> = {};
      for (const p of (photos || []) as { room_slug: string; photo_url: string }[]) {
        if (!photosBySlug[p.room_slug]) photosBySlug[p.room_slug] = [];
        photosBySlug[p.room_slug].push(localizeMediaUrl(p.photo_url));
      }

      const mapped: Room[] = data.map((r: Record<string, unknown>) => {
        const slug = r.slug as string;
        return {
          id: r.id as string,
          slug,
          name: r.name as string,
          description: r.description as string,
          price: Number(r.price),
          weekendPrice: Number(r.weekend_price),
          seasonalPrice: Number(r.seasonal_price),
          capacity: r.capacity as number,
          bedType: r.bed_type as string,
          roomSize: r.room_size as string,
          viewType: r.view_type as string,
          amenities: r.amenities as string[],
          images: photosBySlug[slug] || [],
          totalRooms: r.total_rooms as number,
        };
      });
      setRooms(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <RoomsContext.Provider value={{ rooms, loading, refresh }}>
      {children}
    </RoomsContext.Provider>
  );
}

export function useRooms() {
  return useContext(RoomsContext);
}
