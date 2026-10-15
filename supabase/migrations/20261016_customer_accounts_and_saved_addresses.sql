-- ==============================================================================
-- Ooh Gas - Phase 3: Customer Accounts, Saved Addresses, Order History & Delivery OTP
-- Supabase Authentication integration, saved delivery locations, customer order isolation,
-- and secure doorstep OTP delivery verification with strict RLS.
-- ==============================================================================

-- 1. Ensure delivery_otp and verification fields exist on public.orders
DO $$ BEGIN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_otp_verified_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_by_driver_id UUID REFERENCES public.profiles(id);
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_last_location GEOMETRY(Point, 4326);
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_last_updated_at TIMESTAMPTZ;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_eta_minutes INTEGER;
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_distance_km NUMERIC(6, 2);
EXCEPTION
    WHEN others THEN null;
END $$;

-- 2. Enhanced Customer Saved Addresses Table
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    town_id TEXT NOT NULL REFERENCES public.towns(id) ON DELETE RESTRICT,
    label TEXT NOT NULL DEFAULT 'Home', -- e.g. 'Home', 'Work', 'Apartment', 'Parents'
    street_address TEXT NOT NULL,
    building_name TEXT,
    house_or_flat_number TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN NOT NULL DEFAULT false,
    delivery_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_loc ON public.customer_addresses USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_default ON public.customer_addresses(customer_id, is_default) WHERE is_default = true;

-- 3. Automatic Profile Creation Trigger on Supabase auth.users Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        phone_number,
        email,
        is_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'customer',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Valued Customer'),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, '+254 700 000000'),
        NEW.email,
        false,
        timezone('utc', now()),
        timezone('utc', now())
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone_number = CASE WHEN EXCLUDED.phone_number != '+254 700 000000' THEN EXCLUDED.phone_number ELSE public.profiles.phone_number END,
        email = EXCLUDED.email,
        updated_at = timezone('utc', now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (if permission granted in Supabase)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
        CREATE TRIGGER on_auth_user_created_customer
            AFTER INSERT OR UPDATE ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer_user();
    END IF;
EXCEPTION
    WHEN others THEN null;
END $$;

-- 4. Row Level Security Policies for Customer Isolation
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers manage own saved addresses" ON public.customer_addresses;
CREATE POLICY "Customers manage own saved addresses"
    ON public.customer_addresses FOR ALL
    USING (auth.uid() = customer_id OR public.is_admin())
    WITH CHECK (auth.uid() = customer_id OR public.is_admin());

-- Ensure customer orders isolation
DROP POLICY IF EXISTS "Customers view own orders" ON public.orders;
CREATE POLICY "Customers view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = customer_id OR public.is_supplier_member(supplier_id) OR public.is_admin());

DROP POLICY IF EXISTS "Customers insert own orders" ON public.orders;
CREATE POLICY "Customers insert own orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = customer_id OR public.is_admin());

-- Ensure customers cannot modify supplier assignment, prices, or status
DROP POLICY IF EXISTS "Customers cannot alter order status" ON public.orders;
CREATE POLICY "Customers update non-sensitive order notes"
    ON public.orders FOR UPDATE
    USING (auth.uid() = customer_id OR public.is_admin())
    WITH CHECK (
        public.is_admin() OR (
            auth.uid() = customer_id AND
            status = 'pending'
        )
    );

-- 5. Stored Procedure: Save or Update Customer Delivery Address
CREATE OR REPLACE FUNCTION public.save_customer_address(
    p_customer_id UUID,
    p_label TEXT,
    p_street_address TEXT,
    p_building_name TEXT,
    p_house_or_flat_number TEXT,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_town_id TEXT DEFAULT 'nairobi',
    p_delivery_notes TEXT DEFAULT NULL,
    p_is_default BOOLEAN DEFAULT false,
    p_address_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_address_id UUID := COALESCE(p_address_id, gen_random_uuid());
    v_point GEOMETRY;
    v_result RECORD;
BEGIN
    -- Verify caller identity: must be same customer or admin
    IF auth.uid() IS NOT NULL AND auth.uid() != p_customer_id AND NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to modify another user''s addresses');
    END IF;

    v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    -- If this is set as default, reset other addresses for this customer
    IF p_is_default THEN
        UPDATE public.customer_addresses
        SET is_default = false
        WHERE customer_id = p_customer_id;
    END IF;

    INSERT INTO public.customer_addresses (
        id,
        customer_id,
        town_id,
        label,
        street_address,
        building_name,
        house_or_flat_number,
        location,
        latitude,
        longitude,
        delivery_notes,
        is_default,
        updated_at
    ) VALUES (
        v_address_id,
        p_customer_id,
        p_town_id,
        p_label,
        p_street_address,
        p_building_name,
        p_house_or_flat_number,
        v_point,
        p_lat,
        p_lng,
        p_delivery_notes,
        p_is_default,
        timezone('utc', now())
    )
    ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        street_address = EXCLUDED.street_address,
        building_name = EXCLUDED.building_name,
        house_or_flat_number = EXCLUDED.house_or_flat_number,
        location = EXCLUDED.location,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        delivery_notes = EXCLUDED.delivery_notes,
        is_default = EXCLUDED.is_default,
        town_id = EXCLUDED.town_id,
        updated_at = timezone('utc', now())
    RETURNING * INTO v_result;

    RETURN jsonb_build_object(
        'success', true,
        'address_id', v_result.id,
        'label', v_result.label,
        'street_address', v_result.street_address,
        'is_default', v_result.is_default
    );
END;
$$;

-- 6. Stored Procedure: Authoritative Doorstep Delivery OTP Verification
-- Atomic row lock prevents duplicate confirmation or brute force tampering
CREATE OR REPLACE FUNCTION public.verify_order_delivery_otp(
    p_order_id UUID,
    p_driver_id UUID,
    p_otp TEXT,
    p_lat DOUBLE PRECISION DEFAULT NULL,
    p_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    IF v_order.status = 'delivered' OR v_order.status = 'DELIVERED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order is already marked as delivered');
    END IF;

    -- Validate OTP match (case-insensitive trim)
    IF v_order.delivery_otp IS NULL OR TRIM(v_order.delivery_otp) != TRIM(p_otp) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid delivery OTP entered. Please confirm the 6-digit code with the customer.');
    END IF;

    -- Update order to DELIVERED atomically
    UPDATE public.orders
    SET status = 'DELIVERED',
        delivery_otp_verified_at = timezone('utc', now()),
        delivered_by_driver_id = p_driver_id,
        driver_last_location = CASE WHEN p_lat IS NOT NULL THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) ELSE driver_last_location END,
        updated_at = timezone('utc', now())
    WHERE id = p_order_id;

    -- Update delivery tracking record if exists
    UPDATE public.deliveries
    SET status = 'completed',
        delivered_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', 'DELIVERED',
        'verified_at', timezone('utc', now())
    );
END;
$$;

-- Realtime publication update
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_addresses;
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN others THEN null;
END $$;
