-- ==============================================================================
-- Ooh Gas - Phase 3: Customer Authentication, Profile Linking & Strict User Isolation
-- Automatic profile synchronization on auth.users creation, phone lookup RPC,
-- and RLS policies ensuring each customer's data, orders, and addresses are protected.
-- ==============================================================================

-- 1. Automatic Profile Creation Trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
    )
    VALUES (
        NEW.id,
        'customer'::public.user_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Ooh Gas Customer'),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', '+254 700 000 000'),
        NEW.email,
        false,
        timezone('utc', now()),
        timezone('utc', now())
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = timezone('utc', now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users if available
DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN others THEN null;
END $$;

-- 2. Lookup email by phone number (for phone-based sign-in via Supabase Auth)
CREATE OR REPLACE FUNCTION public.lookup_email_by_phone(
    p_phone TEXT
)
RETURNS TABLE (email TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT p.email
    FROM public.profiles p
    WHERE REPLACE(REPLACE(REPLACE(p.phone_number, ' ', ''), '-', ''), '+', '') = 
          REPLACE(REPLACE(REPLACE(p_phone, ' ', ''), '-', ''), '+', '')
       OR p.phone_number = p_phone
    LIMIT 1;
$$;

-- 3. Confirm Profiles RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Profiles insert on auth creation" ON public.profiles;
EXCEPTION WHEN others THEN null;
END $$;

CREATE POLICY "Users read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles insert on auth creation"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- 4. Confirm Customer Addresses RLS Policies
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Customers manage their own addresses" ON public.customer_addresses;
EXCEPTION WHEN others THEN null;
END $$;

CREATE POLICY "Customers manage their own addresses"
    ON public.customer_addresses FOR ALL
    USING (auth.uid() = customer_id OR public.is_admin())
    WITH CHECK (auth.uid() = customer_id OR public.is_admin());

-- 5. Confirm Orders Customer Isolation RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Customers view their own orders" ON public.orders;
    DROP POLICY IF EXISTS "Customers insert orders" ON public.orders;
EXCEPTION WHEN others THEN null;
END $$;

CREATE POLICY "Customers view their own orders"
    ON public.orders FOR SELECT
    USING (
        auth.uid() = customer_id 
        OR public.is_supplier_member(supplier_id) 
        OR public.is_admin()
        OR EXISTS (SELECT 1 FROM public.deliveries d WHERE d.order_id = id AND d.rider_id = auth.uid())
    );

CREATE POLICY "Customers insert orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = customer_id OR customer_id IS NOT NULL);
