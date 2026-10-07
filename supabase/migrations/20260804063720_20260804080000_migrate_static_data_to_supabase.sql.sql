/*
# Migrate all static hotel data into Supabase tables

## Purpose
Move all hardcoded data from src/data/hotel.ts into Supabase tables so that
every piece of hotel data is managed through the database. This includes:
hotel settings, attractions, amenities, restaurant menu items, guest reviews,
and location info.

## New Tables
1. `hotel_settings` — single-row table with hotel name, contact info, social links
2. `attractions` — nearby attractions with images, distances, maps links
3. `amenities` — hotel amenity list with icons and descriptions
4. `menu_items` — restaurant menu items
5. `reviews` — guest reviews with ratings
6. `location_info` — nearby landmarks with distances

## Security (RLS)
- All tables: SELECT is public (anon + authenticated) — website content is public.
- INSERT/UPDATE/DELETE: only admin_or_manager can modify.
- hotel_settings is a singleton (one row, id=1).

## Seed Data
- All existing data from src/data/hotel.ts is inserted as seed rows.

## Notes
1. All tables are idempotent — safe to re-run.
2. Existing tables (bookings, rooms, users, room_photos, gallery_photos,
   room_price_overrides, activity_log, room_statuses, booking_notes,
   staff_tasks) are NOT touched.
*/

-- ============================================================
-- 1. hotel_settings (singleton)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hotel_settings (
  id integer PRIMARY KEY DEFAULT 1,
  name text NOT NULL DEFAULT 'Auremonté Simi Grand Hotel',
  short_name text NOT NULL DEFAULT 'Auremonté Simi Grand',
  tagline text NOT NULL DEFAULT 'Himalayan Modernism · Manali',
  subtitle text NOT NULL DEFAULT 'Boutique Hotel · Manali',
  phone text NOT NULL DEFAULT '9310213175',
  phone_display text NOT NULL DEFAULT '+91 93102 13175',
  email text NOT NULL DEFAULT 'stay@simigrand.com',
  address text NOT NULL DEFAULT 'Village Shuru, Tehsil Manali, District Kullu, Himachal Pradesh',
  short_address text NOT NULL DEFAULT 'Village Shuru, Tehsil Manali',
  region text NOT NULL DEFAULT 'Manali, HP',
  instagram text,
  facebook text,
  maps_embed text,
  maps_link text,
  whatsapp_message text,
  upi_id text,
  upi_payee_name text,
  hero_video text NOT NULL DEFAULT '/media/hero/hero.mp4',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_hotel_settings" ON public.hotel_settings;
CREATE POLICY "public_select_hotel_settings"
  ON public.hotel_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manager_update_hotel_settings" ON public.hotel_settings;
CREATE POLICY "admin_manager_update_hotel_settings"
  ON public.hotel_settings FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_insert_hotel_settings" ON public.hotel_settings;
CREATE POLICY "admin_manager_insert_hotel_settings"
  ON public.hotel_settings FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

-- Seed the singleton row
INSERT INTO public.hotel_settings (id, name, short_name, tagline, subtitle, phone, phone_display, email, address, short_address, region, instagram, facebook, maps_embed, maps_link, whatsapp_message, upi_id, upi_payee_name, hero_video)
VALUES (1,
  'Auremonté Simi Grand Hotel',
  'Auremonté Simi Grand',
  'Himalayan Modernism · Manali',
  'Boutique Hotel · Manali',
  '9310213175',
  '+91 93102 13175',
  'stay@simigrand.com',
  'Village Shuru, Tehsil Manali, District Kullu, Himachal Pradesh',
  'Village Shuru, Tehsil Manali',
  'Manali, HP',
  'https://www.instagram.com/morpheussimigrand',
  'https://www.facebook.com/profile.php?id=61592757238649',
  'https://www.google.com/maps?q=Shuru,Manali,Himachal+Pradesh&output=embed',
  'https://maps.app.goo.gl/TycXUBkmNo7gLQmA9?g_st=iw',
  'Hello, I would like to enquire about staying at Auremonté Simi Grand Hotel.',
  'Q221548280@ybl',
  'Auremonte Simi Grand',
  '/media/hero/hero.mp4'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. attractions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attractions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  image text NOT NULL,
  distance text NOT NULL,
  travel_time text NOT NULL,
  maps_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.attractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_attractions" ON public.attractions;
CREATE POLICY "public_select_attractions"
  ON public.attractions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manager_insert_attractions" ON public.attractions;
CREATE POLICY "admin_manager_insert_attractions"
  ON public.attractions FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_update_attractions" ON public.attractions;
CREATE POLICY "admin_manager_update_attractions"
  ON public.attractions FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_delete_attractions" ON public.attractions;
CREATE POLICY "admin_manager_delete_attractions"
  ON public.attractions FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

CREATE INDEX IF NOT EXISTS idx_attractions_sort_order ON public.attractions(sort_order);

INSERT INTO public.attractions (id, name, description, image, distance, travel_time, maps_url, sort_order)
VALUES
  ('1', 'Hadimba Temple', 'An ancient cedar-wood temple nestled in a towering deodar forest — Manali''s most iconic shrine.', '/media/attractions/hadimba.jpg', '3 km', '10 min', 'https://maps.google.com/?q=Hadimba+Temple+Manali', 1),
  ('2', 'Jogini Falls', 'A serene waterfall reached by a scenic riverside trail through pine and prayer flags.', '/media/attractions/jogini.jpg', '4 km', '15 min', 'https://maps.google.com/?q=Jogini+Falls+Manali', 2),
  ('3', 'Old Manali', 'Charming lanes, apple orchards, riverside cafés and a bohemian mountain spirit.', '/media/room-photos/luxury-room/3.jpg', '4.5 km', '15 min', 'https://maps.google.com/?q=Old+Manali', 3),
  ('4', 'Mall Road', 'Manali''s vibrant promenade of cafés, local crafts, bakeries and mountain culture.', '/media/attractions/mall.jpg', '2.5 km', '8 min', 'https://maps.google.com/?q=Mall+Road+Manali', 4),
  ('5', 'Solang Valley', 'A wide valley meadow for paragliding, zorbing and snow play in season.', '/media/attractions/solang.jpg', '14 km', '45 min', 'https://maps.google.com/?q=Solang+Valley', 5),
  ('6', 'Rohtang Pass', 'A high-altitude pass offering panoramic snow views and alpine adventure (seasonal).', '/media/attractions/rohtang.jpg', '50 km', '2 hr', 'https://maps.google.com/?q=Rohtang+Pass', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. amenities
-- ============================================================
CREATE TABLE IF NOT EXISTS public.amenities (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_amenities" ON public.amenities;
CREATE POLICY "public_select_amenities"
  ON public.amenities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manager_insert_amenities" ON public.amenities;
CREATE POLICY "admin_manager_insert_amenities"
  ON public.amenities FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_update_amenities" ON public.amenities;
CREATE POLICY "admin_manager_update_amenities"
  ON public.amenities FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_delete_amenities" ON public.amenities;
CREATE POLICY "admin_manager_delete_amenities"
  ON public.amenities FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

CREATE INDEX IF NOT EXISTS idx_amenities_sort_order ON public.amenities(sort_order);

INSERT INTO public.amenities (id, name, description, icon, sort_order)
VALUES
  ('1', 'High-Speed Wi-Fi', 'Complimentary fibre internet throughout the property.', 'wifi', 1),
  ('2', 'Free Parking', 'Secure on-site parking for all in-house guests.', 'car', 2),
  ('3', '24-Hour Front Desk', 'Round-the-clock concierge and assistance.', 'concierge-bell', 3),
  ('4', 'Garden Lawn', 'Landscaped lawn framed by cedar and pine.', 'trees', 4),
  ('5', 'Mountain-View Dining', 'Restaurant serving Himachali and Indian cuisine.', 'utensils', 5),
  ('6', 'In-Room Dining', 'Room service for a private, restful meal.', 'room-service', 6),
  ('7', 'Bonfire Evenings', 'Curated bonfire nights under the mountain sky.', 'flame', 7),
  ('8', 'Travel & Trek Desk', 'Curated local experiences and guided excursions.', 'map', 8),
  ('9', 'Laundry Service', 'Same-day laundry and dry cleaning.', 'shirt', 9),
  ('10', 'Power Backup', 'Uninterrupted power for every stay.', 'zap', 10),
  ('11', 'CCTV & Security', 'Surveillance and secure access throughout.', 'shield-check', 11),
  ('12', 'Valley & Mountain Views', 'Panoramic Himalayan vistas from select rooms.', 'mountain', 12)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. menu_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  image text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_menu_items" ON public.menu_items;
CREATE POLICY "public_select_menu_items"
  ON public.menu_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manager_insert_menu_items" ON public.menu_items;
CREATE POLICY "admin_manager_insert_menu_items"
  ON public.menu_items FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_update_menu_items" ON public.menu_items;
CREATE POLICY "admin_manager_update_menu_items"
  ON public.menu_items FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_delete_menu_items" ON public.menu_items;
CREATE POLICY "admin_manager_delete_menu_items"
  ON public.menu_items FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON public.menu_items(sort_order);

INSERT INTO public.menu_items (id, name, description, image, sort_order)
VALUES
  ('1', 'Trout à la Manali', 'Fresh Beas-river trout, pan-seared with herbs and Himalayan butter.', '/media/gallery-photos/10.jpg', 1),
  ('2', 'Valley Garden Salad', 'Seasonal greens, orchard apples and a pine-nut vinaigrette.', '/media/room-photos/luxury-room/2.jpg', 2),
  ('3', 'Cedar-Smoked Lamb', 'Slow-cooked lamb infused with cedar smoke and mountain spices.', '/media/gallery-photos/7.jpg', 3),
  ('4', 'Himachali Dham', 'A traditional festive platter of local lentils, curries and rice served on leaf plates.', '/media/room-photos/luxury-room/3.jpg', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id text PRIMARY KEY,
  author text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  review_date text NOT NULL,
  review_text text NOT NULL,
  country text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_reviews" ON public.reviews;
CREATE POLICY "public_select_reviews"
  ON public.reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manager_insert_reviews" ON public.reviews;
CREATE POLICY "admin_manager_insert_reviews"
  ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_update_reviews" ON public.reviews;
CREATE POLICY "admin_manager_update_reviews"
  ON public.reviews FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_delete_reviews" ON public.reviews;
CREATE POLICY "admin_manager_delete_reviews"
  ON public.reviews FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

CREATE INDEX IF NOT EXISTS idx_reviews_sort_order ON public.reviews(sort_order);

INSERT INTO public.reviews (id, author, rating, review_date, review_text, country, sort_order)
VALUES
  ('1', 'Aarav & Diya Sharma', 5, '2025-10-04', 'Woke up to a wall of mountains every morning. The rooms are impeccable and the staff treated us like family. The bonfire evening was unforgettable.', 'India', 1),
  ('2', 'Sophie Laurent', 5, '2025-09-21', 'The most serene boutique stay in Manali. Warm interiors, cold mountain air, and a dining experience that rivals any hotel I''ve stayed in.', 'France', 2),
  ('3', 'Rohan Mehta', 5, '2025-08-15', 'Spotless design, thoughtful hospitality, and views that stop you mid-sentence. Auremonté Simi Grand is now our default Manali address.', 'India', 3),
  ('4', 'Emma Whitfield', 5, '2025-07-09', 'From the misty mornings to the candlelit dinners, every detail felt intentional. A true sanctuary above Manali.', 'United Kingdom', 4),
  ('5', 'Liam O''Connor', 5, '2025-06-30', 'We came for the views and stayed for the warmth. The team arranged a private bonfire and a trek — faultless.', 'Ireland', 5),
  ('6', 'Karan & Neha', 4, '2025-11-12', 'Beautiful property with extraordinary views. The food was excellent and the rooms wonderfully quiet. Will return in winter.', 'India', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. location_info
-- ============================================================
CREATE TABLE IF NOT EXISTS public.location_info (
  id text PRIMARY KEY,
  name text NOT NULL,
  distance text NOT NULL,
  travel_time text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.location_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_location_info" ON public.location_info;
CREATE POLICY "public_select_location_info"
  ON public.location_info FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manager_insert_location_info" ON public.location_info;
CREATE POLICY "admin_manager_insert_location_info"
  ON public.location_info FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_update_location_info" ON public.location_info;
CREATE POLICY "admin_manager_update_location_info"
  ON public.location_info FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_delete_location_info" ON public.location_info;
CREATE POLICY "admin_manager_delete_location_info"
  ON public.location_info FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

CREATE INDEX IF NOT EXISTS idx_location_info_sort_order ON public.location_info(sort_order);

INSERT INTO public.location_info (id, name, distance, travel_time, sort_order)
VALUES
  ('1', 'Mall Road, Manali', '2.5 km', '8 min', 1),
  ('2', 'Hadimba Temple', '3 km', '10 min', 2),
  ('3', 'Manali Bus Stand', '4 km', '15 min', 3),
  ('4', 'Old Manali', '4.5 km', '15 min', 4),
  ('5', 'Bhuntar Airport (KUU)', '51 km', '2 hr', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. gallery_images (static gallery order/labels)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id text PRIMARY KEY,
  src text NOT NULL,
  label text,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_gallery_images" ON public.gallery_images;
CREATE POLICY "public_select_gallery_images"
  ON public.gallery_images FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_manager_insert_gallery_images" ON public.gallery_images;
CREATE POLICY "admin_manager_insert_gallery_images"
  ON public.gallery_images FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_update_gallery_images" ON public.gallery_images;
CREATE POLICY "admin_manager_update_gallery_images"
  ON public.gallery_images FOR UPDATE
  TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admin_manager_delete_gallery_images" ON public.gallery_images;
CREATE POLICY "admin_manager_delete_gallery_images"
  ON public.gallery_images FOR DELETE
  TO authenticated USING (public.is_admin_or_manager());

CREATE INDEX IF NOT EXISTS idx_gallery_images_sort_order ON public.gallery_images(sort_order);

INSERT INTO public.gallery_images (id, src, label, sort_order)
VALUES
  ('1', '/media/gallery-photos/1.jpg', 'Hotel facade', 1),
  ('2', '/media/gallery-photos/2.jpg', 'Deluxe Room', 2),
  ('3', '/media/gallery-photos/3.jpg', 'Deluxe Room interior', 3),
  ('4', '/media/gallery-photos/4.jpg', 'Room with mountain view', 4),
  ('5', '/media/gallery-photos/5.jpg', 'Room detail', 5),
  ('6', '/media/gallery-photos/6.jpg', 'Premium Room', 6),
  ('7', '/media/gallery-photos/7.jpg', 'Premium Room balcony view', 7),
  ('8', '/media/gallery-photos/8.jpg', 'Hotel exterior', 8),
  ('9', '/media/gallery-photos/9.jpg', 'Hotel building', 9),
  ('10', '/media/gallery-photos/10.jpg', 'Dining area', 10),
  ('11', '/media/gallery-photos/11.jpg', 'Hotel lounge', 11),
  ('12', '/media/gallery-photos/12.jpg', 'Luxury Room terrace', 12),
  ('13', '/media/gallery-photos/13.jpg', 'Panoramic mountain view', 13),
  ('14', '/media/gallery-photos/14.jpg', 'Valley view', 14),
  ('15', '/media/gallery-photos/15.jpg', 'Room interior', 15),
  ('16', '/media/gallery-photos/16.jpg', 'Room with balcony', 16),
  ('17', '/media/gallery-photos/17.jpg', 'Boutique room detail', 17),
  ('18', '/media/gallery-photos/18.jpg', 'Mountain view from room', 18),
  ('19', '/media/gallery-photos/19.jpg', 'Room with orchard view', 19),
  ('20', '/media/gallery-photos/20.jpg', 'Luxury Room', 20),
  ('21', '/media/gallery-photos/21.jpg', 'Hotel surroundings', 21),
  ('22', '/media/gallery-photos/22.jpg', 'Hotel landscape', 22),
  ('23', '/media/gallery-photos/23.jpg', 'Hotel entrance', 23)
ON CONFLICT (id) DO NOTHING;
