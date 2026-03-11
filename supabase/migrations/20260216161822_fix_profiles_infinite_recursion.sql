/*
  # Fix Infinite Recursion in Profiles Policies

  ## Problem
  The policies on the `profiles` table were causing infinite recursion because they
  were querying the same table they were protecting (e.g., `EXISTS (SELECT FROM profiles ...)`).

  ## Solution
  1. Create a SECURITY DEFINER function that bypasses RLS to check if a user is admin
  2. Drop all existing policies on profiles
  3. Recreate policies using the helper function instead of direct table queries

  ## Changes
  - Drop existing policies that cause recursion
  - Create `is_admin()` helper function
  - Create new policies:
    - Users can view and update their own profile
    - Admins can view, insert, update, and delete all profiles

  ## Security
  - SECURITY DEFINER function is safe because it only returns boolean based on auth.uid()
  - All policies still properly restrict access
  - Users can only modify their own profile unless they are admin
*/

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create helper function to check if current user is admin
-- SECURITY DEFINER means it runs with owner privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Create new policies using the helper function

-- SELECT policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- INSERT policies
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE policies
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE policies
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());
