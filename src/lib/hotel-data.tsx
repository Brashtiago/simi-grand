import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface HotelSettings {
  name: string;
  short_name: string;
  tagline: string;
  subtitle: string;
  phone: string;
  phone_display: string;
  email: string;
  marketing_email: string;
  address: string;
  short_address: string;
  region: string;
  instagram: string;
  facebook: string;
  maps_embed: string;
  maps_link: string;
  whatsapp_message: string;
  upi_id: string;
  upi_payee_name: string;
  hero_video: string;
}

export interface Attraction {
  id: string;
  name: string;
  description: string;
  image: string;
  distance: string;
  travel_time: string;
  maps_url: string;
}

export interface Amenity {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  review: string;
  country: string;
}

export interface LocationInfo {
  id: string;
  name: string;
  distance: string;
  travel_time: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  label: string;
}

interface HotelDataContextType {
  settings: HotelSettings | null;
  attractions: Attraction[];
  amenities: Amenity[];
  menuItems: MenuItem[];
  reviews: Review[];
  locationInfo: LocationInfo[];
  galleryImages: GalleryImage[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const HotelDataContext = createContext<HotelDataContextType>({
  settings: null,
  attractions: [],
  amenities: [],
  menuItems: [],
  reviews: [],
  locationInfo: [],
  galleryImages: [],
  loading: true,
  refresh: async () => {},
});

export function HotelDataProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<HotelSettings | null>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [locationInfo, setLocationInfo] = useState<LocationInfo[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [
      { data: settingsData },
      { data: attractionsData },
      { data: amenitiesData },
      { data: menuData },
      { data: reviewsData },
      { data: locationData },
      { data: galleryData },
    ] = await Promise.all([
      supabase.from('hotel_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('attractions').select('*').order('sort_order', { ascending: true }),
      supabase.from('amenities').select('*').order('sort_order', { ascending: true }),
      supabase.from('menu_items').select('*').order('sort_order', { ascending: true }),
      supabase.from('reviews').select('*').order('sort_order', { ascending: true }),
      supabase.from('location_info').select('*').order('sort_order', { ascending: true }),
      supabase.from('gallery_images').select('*').order('sort_order', { ascending: true }),
    ]);

    if (settingsData) {
      setSettings({
        name: settingsData.name,
        short_name: settingsData.short_name,
        tagline: settingsData.tagline,
        subtitle: settingsData.subtitle,
        phone: settingsData.phone,
        phone_display: settingsData.phone_display,
        email: settingsData.email,
        marketing_email: settingsData.marketing_email || '',
        address: settingsData.address,
        short_address: settingsData.short_address,
        region: settingsData.region,
        instagram: settingsData.instagram || '',
        facebook: settingsData.facebook || '',
        maps_embed: settingsData.maps_embed || '',
        maps_link: settingsData.maps_link || '',
        whatsapp_message: settingsData.whatsapp_message || '',
        upi_id: settingsData.upi_id || '',
        upi_payee_name: settingsData.upi_payee_name || '',
        hero_video: settingsData.hero_video || '/media/hero/hero.mp4',
      });
    }

    if (attractionsData) {
      setAttractions(attractionsData.map((a: Record<string, unknown>) => ({
        id: a.id as string,
        name: a.name as string,
        description: a.description as string,
        image: a.image as string,
        distance: a.distance as string,
        travel_time: a.travel_time as string,
        maps_url: a.maps_url as string,
      })));
    }

    if (amenitiesData) {
      setAmenities(amenitiesData.map((a: Record<string, unknown>) => ({
        id: a.id as string,
        name: a.name as string,
        description: a.description as string,
        icon: a.icon as string,
      })));
    }

    if (menuData) {
      setMenuItems(menuData.map((m: Record<string, unknown>) => ({
        id: m.id as string,
        name: m.name as string,
        description: m.description as string,
        image: m.image as string,
      })));
    }

    if (reviewsData) {
      setReviews(reviewsData.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        author: r.author as string,
        rating: r.rating as number,
        date: r.review_date as string,
        review: r.review_text as string,
        country: r.country as string,
      })));
    }

    if (locationData) {
      setLocationInfo(locationData.map((l: Record<string, unknown>) => ({
        id: l.id as string,
        name: l.name as string,
        distance: l.distance as string,
        travel_time: l.travel_time as string,
      })));
    }

    if (galleryData) {
      setGalleryImages(galleryData.map((g: Record<string, unknown>) => ({
        id: g.id as string,
        src: g.src as string,
        label: (g.label as string) || '',
      })));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <HotelDataContext.Provider value={{ settings, attractions, amenities, menuItems, reviews, locationInfo, galleryImages, loading, refresh }}>
      {children}
    </HotelDataContext.Provider>
  );
}

export function useHotelData() {
  return useContext(HotelDataContext);
}
