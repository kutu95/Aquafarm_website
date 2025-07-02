-- Fix RLS policy for pages table to allow correct menu visibility
DROP POLICY IF EXISTS "Enable read access based on security level" ON pages;

CREATE POLICY "Enable read access based on security level"
  ON pages FOR SELECT
  USING (
    security = 'open'
    OR (security = 'user' AND auth.role() = 'authenticated')
    OR (
      security = 'admin'
      AND auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  ); 