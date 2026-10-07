/*
# Restrict handle_new_user execute to authenticated only

The function should only be called by logged-in staff, not anon users.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
