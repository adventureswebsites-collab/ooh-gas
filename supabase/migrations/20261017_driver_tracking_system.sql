-- ==============================================================================
-- Ooh Gas - Driver Tracking & Telemetry System
-- Idempotent migration reconciling earlier driver_locations schema (if present)
-- and ensuring recorded_at, speed, and RLS policies exist cleanly.
-- ==============================================================================

-- 1. Create Driver Location Updates Table if it does not exist yet
CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Safely reconcile columns if driver_locations already existed from an earlier migration
ALTER TABLE public.driver_locations
    ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- If `updated_at` exists from earlier migration and `recorded_at` was just added, backfill timestamps
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'driver_locations' AND column_name = 'updated_at'
    ) THEN
        UPDATE public.driver_locations
        SET recorded_at = COALESCE(updated_at, timezone('utc', now()))
        WHERE recorded_at IS NULL;
    END IF;
EXCEPTION WHEN others THEN null;
END $$;

-- If `location` PostGIS column exists with NOT NULL from earlier migration, allow nullable inserts
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'driver_locations' AND column_name = 'location'
    ) THEN
        ALTER TABLE public.driver_locations ALTER COLUMN location DROP NOT NULL;
    END IF;
EXCEPTION WHEN others THEN null;
END $$;

-- 3. Create indexes safely now that all columns are guaranteed to exist
CREATE INDEX IF NOT EXISTS idx_driver_locations_order ON public.driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded ON public.driver_locations(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- 4. Idempotent RLS Security Policies
DROP POLICY IF EXISTS "Drivers can insert location updates" ON public.driver_locations;
CREATE POLICY "Drivers can insert location updates"
    ON public.driver_locations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Order participants can view driver location" ON public.driver_locations;
CREATE POLICY "Order participants can view driver location"
    ON public.driver_locations
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon read for active delivery tracking" ON public.driver_locations;
CREATE POLICY "Allow anon read for active delivery tracking"
    ON public.driver_locations
    FOR SELECT
    TO anon
    USING (true);

-- 5. Register table with Supabase Realtime publication
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;
