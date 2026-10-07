-- Allow admin and manager roles to delete bookings
CREATE POLICY "admin_manager_delete_bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());
