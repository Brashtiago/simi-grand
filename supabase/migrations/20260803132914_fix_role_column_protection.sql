/*
# Fix role column protection on users table

## Problem
Previous REVOKE UPDATE (role) didn't take effect because table-level UPDATE grant
overrides column-level REVOKE in PostgreSQL's privilege resolution.

## Solution
1. REVOKE ALL on users FROM authenticated (clear everything)
2. GRANT SELECT on users TO authenticated (read own profile)
3. GRANT INSERT on users TO authenticated (auto-create profile)
4. GRANT UPDATE (id, email, created_at) on users TO authenticated
   — explicitly listing columns EXCLUDING role, so authenticated can update
   their own profile but NOT their role.

## Result
- authenticated: SELECT all columns, INSERT all columns, UPDATE only non-role columns
- anon: no access
- service_role: full access (used by SECURITY DEFINER function for role management)
*/

REVOKE ALL ON public.users FROM anon, authenticated;

GRANT SELECT ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated;
GRANT UPDATE (id, email, created_at) ON public.users TO authenticated;
