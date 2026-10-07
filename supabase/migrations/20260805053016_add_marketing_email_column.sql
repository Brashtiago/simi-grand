ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS marketing_email text DEFAULT 'marketing@auremontehotels.com';

UPDATE hotel_settings SET email = 'stay@auremontehotels.com', marketing_email = 'marketing@auremontehotels.com' WHERE id = 1;
