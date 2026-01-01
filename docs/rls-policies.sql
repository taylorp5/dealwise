-- Row-Level Security (RLS) Policies for Dealership Copilot
-- Run this in your Supabase SQL Editor

-- Enable RLS on tables (if not already enabled)
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- DEALS TABLE POLICIES
-- Allow users to insert their own deals
CREATE POLICY "Users can insert their own deals"
ON deals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own deals
CREATE POLICY "Users can select their own deals"
ON deals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own deals
CREATE POLICY "Users can update their own deals"
ON deals
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own deals
CREATE POLICY "Users can delete their own deals"
ON deals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ANALYSES TABLE POLICIES
-- Allow users to insert their own analyses
CREATE POLICY "Users can insert their own analyses"
ON analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own analyses
CREATE POLICY "Users can select their own analyses"
ON analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own analyses
CREATE POLICY "Users can update their own analyses"
ON analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own analyses
CREATE POLICY "Users can delete their own analyses"
ON analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);






