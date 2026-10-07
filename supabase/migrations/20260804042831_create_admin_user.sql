/*
# Create admin auth user for pratikshkasana8844@gmail.com

## Purpose
Create the first admin account so they can log in to the staff dashboard.
The email pratikshkasana8844@gmail.com is already designated as admin in the
handle_new_user() function — when this user logs in for the first time,
their profile will be auto-created with role = 'Admin'.

## What This Does
1. Inserts a new row into auth.users with the admin email
2. Sets a temporary encrypted password: TempAdmin2026!
3. Marks email as confirmed via email_confirmed_at

## Security
- No RLS changes — existing policies remain intact
- No schema changes — only a data insert into auth.users

## Notes
1. This migration is idempotent — uses IF NOT EXISTS check
2. After first login, handle_new_user() auto-creates the users table profile
3. Temporary password: TempAdmin2026!
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'pratikshkasana8844@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'pratikshkasana8844@gmail.com',
      crypt('TempAdmin2026!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{}'::jsonb,
      '{}'::jsonb
    );
  END IF;
END $$;
