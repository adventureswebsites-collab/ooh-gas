-- ==============================================================================
-- Ooh Gas - Phase 1: Multi-Supplier Delivery Platform Architecture & Schema
-- Multi-town support, independent suppliers, PostGIS delivery zones,
-- supplier-specific products/pricing, orders, payments, deliveries, & strict RLS
-- ==============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Enumerated Types
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('customer', 'supplier_member', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.supplier_member_role AS ENUM ('owner', 'manager', 'staff', 'rider');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.supplier_status AS ENUM ('draft', 'pending_verification', 'active', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.cylinder_size AS ENUM ('6kg', '13kg', '29kg', '45kg', '50kg');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.purchase_type AS ENUM ('refill', 'complete_unit', 'exchange');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM (
        'pending',
        'accepted',
        'preparing',
        'out_for_delivery',
        'delivered',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('mpesa', 'cash_on_delivery', 'card');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.delivery_status AS ENUM ('assigned', 'in_transit', 'arrived', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. Core Tables
-- ==============================================================================

-- 3.1 User Profiles (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'customer',
    phone_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);

-- 3.2 Towns in Kenya (Nairobi, Mombasa, Kisumu, Nakuru, Eldoret)
CREATE TABLE IF NOT EXISTS public.towns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    county TEXT NOT NULL,
    center_point GEOMETRY(Point, 4326) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_towns_center ON public.towns USING GIST (center_point);
CREATE INDEX IF NOT EXISTS idx_towns_is_active ON public.towns(is_active);

-- 3.3 Supplier Businesses (Independent LPG Distributors & Depots)
CREATE TABLE IF NOT EXISTS public.supplier_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    trade_name TEXT NOT NULL,
    epra_license_number TEXT,
    kra_pin TEXT,
    phone_number TEXT NOT NULL,
    email TEXT,
    primary_town_id TEXT NOT NULL REFERENCES public.towns(id) ON DELETE RESTRICT,
    depot_location GEOMETRY(Point, 4326) NOT NULL,
    status public.supplier_status NOT NULL DEFAULT 'draft',
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    opens_at TIME NOT NULL DEFAULT '07:30',
    closes_at TIME NOT NULL DEFAULT '21:30',
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.80 CHECK (rating >= 1.0 AND rating <= 5.0),
    review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_suppliers_primary_town ON public.supplier_businesses(primary_town_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.supplier_businesses(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_depot_loc ON public.supplier_businesses USING GIST (depot_location);

-- 3.4 Supplier Memberships (RBAC linking users to supplier businesses)
CREATE TABLE IF NOT EXISTS public.supplier_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.supplier_businesses(id) ON DELETE CASCADE,
    role public.supplier_member_role NOT NULL DEFAULT 'staff',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(user_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.supplier_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_supplier ON public.supplier_memberships(supplier_id);
CREATE INDEX IF NOT EXISTS idx_memberships_active ON public.supplier_memberships(is_active);

CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.supplier_businesses(id) ON DELETE CASCADE,
    town_id TEXT NOT NULL REFERENCES public.towns(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#10b981',
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    base_delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (base_delivery_fee >= 0),
    min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 1000.00 CHECK (min_order_value >= 0),
    estimated_delivery_min TEXT NOT NULL DEFAULT '20–30 min',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure supplier_id and town_id exist if table pre-existed from an earlier prototype
DO $$ BEGIN
    ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.supplier_businesses(id) ON DELETE CASCADE;
    ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS town_id TEXT REFERENCES public.towns(id) ON DELETE RESTRICT;
    ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS base_delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
    ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 1000.00;
    ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS estimated_delivery_min TEXT NOT NULL DEFAULT '20–30 min';
EXCEPTION
    WHEN others THEN null;
END $$;

-- Crucial PostGIS spatial GIST index on zone polygon boundary
CREATE INDEX IF NOT EXISTS idx_delivery_zones_boundary ON public.delivery_zones USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_supplier ON public.delivery_zones(supplier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_town ON public.delivery_zones(town_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON public.delivery_zones(is_active);

-- 3.6 Master Products Catalog
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,
    cylinder_size public.cylinder_size NOT NULL,
    valve_type TEXT NOT NULL DEFAULT '20mm Compact',
    tare_weight_kg NUMERIC(5, 2),
    image_url TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(brand, cylinder_size, valve_type)
);

CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_size ON public.products(cylinder_size);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- 3.7 Supplier-Specific Products, Prices & Stock Inventory
CREATE TABLE IF NOT EXISTS public.supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.supplier_businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    refill_price NUMERIC(10, 2) NOT NULL CHECK (refill_price > 0),
    complete_price NUMERIC(10, 2) NOT NULL CHECK (complete_price >= refill_price),
    exchange_price NUMERIC(10, 2) CHECK (exchange_price >= refill_price),
    stock_refill INTEGER NOT NULL DEFAULT 0 CHECK (stock_refill >= 0),
    stock_complete INTEGER NOT NULL DEFAULT 0 CHECK (stock_complete >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    min_stock_alert INTEGER NOT NULL DEFAULT 5 CHECK (min_stock_alert >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(supplier_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON public.supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_avail ON public.supplier_products(is_available);

-- 3.8 Customer Delivery Addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    town_id TEXT NOT NULL REFERENCES public.towns(id) ON DELETE RESTRICT,
    label TEXT NOT NULL DEFAULT 'Home',
    street_address TEXT NOT NULL,
    building_name TEXT,
    house_or_flat_number TEXT,
    location GEOMETRY(Point, 4326) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    delivery_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_customer_addr_customer ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addr_loc ON public.customer_addresses USING GIST (location);

-- 3.9 Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.supplier_businesses(id) ON DELETE RESTRICT,
    town_id TEXT NOT NULL REFERENCES public.towns(id) ON DELETE RESTRICT,
    delivery_zone_id UUID REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
    status public.order_status NOT NULL DEFAULT 'pending',
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    delivery_address_snapshot JSONB NOT NULL,
    delivery_point GEOMETRY(Point, 4326) NOT NULL,
    delivery_timing_type TEXT NOT NULL DEFAULT 'asap',
    scheduled_for TIMESTAMPTZ,
    customer_notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON public.orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_town ON public.orders(town_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_point ON public.orders USING GIST (delivery_point);

-- 3.10 Order Line Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    supplier_product_id UUID REFERENCES public.supplier_products(id) ON DELETE SET NULL,
    purchase_type public.purchase_type NOT NULL,
    cylinder_size public.cylinder_size NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- 3.11 Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    payment_method public.payment_method NOT NULL DEFAULT 'mpesa',
    status public.payment_status NOT NULL DEFAULT 'pending',
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    phone_number TEXT NOT NULL,
    mpesa_checkout_request_id TEXT,
    mpesa_receipt_number TEXT,
    payment_metadata JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_receipt ON public.payments(mpesa_receipt_number);

-- 3.12 Deliveries (Rider assignment & Live GPS Tracking)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status public.delivery_status NOT NULL DEFAULT 'assigned',
    current_location GEOMETRY(Point, 4326),
    verification_code TEXT,
    rider_notes TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_rider ON public.deliveries(rider_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_cur_loc ON public.deliveries USING GIST (current_location);

-- ==============================================================================
-- 4. Automatic Timestamp Update Triggers
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_supplier_businesses_updated_at
    BEFORE UPDATE ON public.supplier_businesses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_delivery_zones_updated_at
    BEFORE UPDATE ON public.delivery_zones
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_supplier_products_updated_at
    BEFORE UPDATE ON public.supplier_products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_customer_addresses_updated_at
    BEFORE UPDATE ON public.customer_addresses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_deliveries_updated_at
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. Helper Auth & Membership Functions for RLS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) OR (auth.jwt() ->> 'role' = 'admin') OR (auth.role() = 'service_role');
$$;

CREATE OR REPLACE FUNCTION public.is_supplier_member(p_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.supplier_memberships
        WHERE user_id = auth.uid()
          AND supplier_id = p_supplier_id
          AND is_active = true
    ) OR public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_supplier_manager_or_owner(p_supplier_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.supplier_memberships
        WHERE user_id = auth.uid()
          AND supplier_id = p_supplier_id
          AND role IN ('owner', 'manager')
          AND is_active = true
    ) OR public.is_admin();
$$;

-- ==============================================================================
-- 6. Row Level Security (RLS) Policies
-- ==============================================================================

-- 6.1 Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Profiles insert on auth creation"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- 6.2 Towns
ALTER TABLE public.towns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active towns"
    ON public.towns FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins manage towns"
    ON public.towns FOR ALL
    USING (public.is_admin());

-- 6.3 Supplier Businesses
ALTER TABLE public.supplier_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active verified suppliers"
    ON public.supplier_businesses FOR SELECT
    USING (status = 'active' OR public.is_supplier_member(id) OR public.is_admin());

CREATE POLICY "Supplier managers update their business profile"
    ON public.supplier_businesses FOR UPDATE
    USING (public.is_supplier_manager_or_owner(id));

CREATE POLICY "Admins full management on suppliers"
    ON public.supplier_businesses FOR ALL
    USING (public.is_admin());

-- 6.4 Supplier Memberships
ALTER TABLE public.supplier_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view team roster"
    ON public.supplier_memberships FOR SELECT
    USING (user_id = auth.uid() OR public.is_supplier_member(supplier_id) OR public.is_admin());

CREATE POLICY "Owners and managers manage memberships"
    ON public.supplier_memberships FOR INSERT
    WITH CHECK (public.is_supplier_manager_or_owner(supplier_id));

CREATE POLICY "Owners and managers update memberships"
    ON public.supplier_memberships FOR UPDATE
    USING (public.is_supplier_manager_or_owner(supplier_id));

CREATE POLICY "Admins full management on memberships"
    ON public.supplier_memberships FOR ALL
    USING (public.is_admin());

-- 6.5 Delivery Zones
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active delivery zones for spatial lookups"
    ON public.delivery_zones FOR SELECT
    USING (is_active = true OR public.is_supplier_member(supplier_id) OR public.is_admin());

CREATE POLICY "Suppliers manage their own delivery zones"
    ON public.delivery_zones FOR ALL
    USING (public.is_supplier_manager_or_owner(supplier_id));

-- 6.6 Products Catalog
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active products"
    ON public.products FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins manage master products"
    ON public.products FOR ALL
    USING (public.is_admin());

-- 6.7 Supplier Products & Pricing
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read available supplier products"
    ON public.supplier_products FOR SELECT
    USING (is_available = true OR public.is_supplier_member(supplier_id) OR public.is_admin());

CREATE POLICY "Suppliers manage their own products and inventory"
    ON public.supplier_products FOR ALL
    USING (public.is_supplier_member(supplier_id));

-- 6.8 Customer Addresses
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage their own addresses"
    ON public.customer_addresses FOR ALL
    USING (auth.uid() = customer_id OR public.is_admin());

-- 6.9 Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

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
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Suppliers update order status"
    ON public.orders FOR UPDATE
    USING (public.is_supplier_member(supplier_id) OR public.is_admin());

-- 6.10 Order Line Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items readable by customer, supplier, or admin"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
              AND (o.customer_id = auth.uid() OR public.is_supplier_member(o.supplier_id) OR public.is_admin())
        )
    );

CREATE POLICY "Customers insert order items with order"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.customer_id = auth.uid()
        )
    );

-- 6.11 Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view their own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = customer_id OR public.is_admin());

CREATE POLICY "Suppliers view payments for their orders"
    ON public.payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND public.is_supplier_member(o.supplier_id)
        )
    );

-- Only service_role or server-side webhook can mutate payments (safe from client tampering)
CREATE POLICY "Server service role manages payments"
    ON public.payments FOR ALL
    USING (auth.role() = 'service_role' OR public.is_admin());

-- 6.12 Deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer tracks delivery for own order"
    ON public.deliveries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.customer_id = auth.uid()
        ) 
        OR rider_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND public.is_supplier_member(o.supplier_id)
        )
        OR public.is_admin()
    );

CREATE POLICY "Rider updates assigned delivery location and status"
    ON public.deliveries FOR UPDATE
    USING (rider_id = auth.uid() OR public.is_admin());

CREATE POLICY "Supplier team manages order deliveries"
    ON public.deliveries FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND public.is_supplier_member(o.supplier_id)
        ) OR public.is_admin()
    );

-- ==============================================================================
-- 7. High-Performance PostGIS Spatial Functions
-- ==============================================================================

-- 7.1 Authoritative Multi-Supplier Location Search
-- Finds all active independent suppliers whose delivery zones enclose the customer's coordinates
CREATE OR REPLACE FUNCTION public.find_suppliers_by_location(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_town_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_point GEOMETRY;
    v_results JSONB;
BEGIN
    -- Construct geographic point in SRID 4326 (lng, lat)
    v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    SELECT jsonb_agg(
        jsonb_build_object(
            'supplier_id', s.id,
            'business_name', s.business_name,
            'trade_name', s.trade_name,
            'phone_number', s.phone_number,
            'rating', s.rating,
            'review_count', s.review_count,
            'logo_url', s.logo_url,
            'opens_at', s.opens_at,
            'closes_at', s.closes_at,
            'zone', jsonb_build_object(
                'id', z.id,
                'name', z.name,
                'color', z.color,
                'delivery_fee', z.base_delivery_fee,
                'min_order_value', z.min_order_value,
                'estimated_delivery_min', z.estimated_delivery_min
            ),
            'available_products', COALESCE(prod_agg.products, '[]'::jsonb)
        )
    )
    INTO v_results
    FROM public.delivery_zones z
    JOIN public.supplier_businesses s ON z.supplier_id = s.id
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(
            jsonb_build_object(
                'supplier_product_id', sp.id,
                'product_id', p.id,
                'brand', p.brand,
                'cylinder_size', p.cylinder_size,
                'valve_type', p.valve_type,
                'refill_price', sp.refill_price,
                'complete_price', sp.complete_price,
                'stock_refill', sp.stock_refill,
                'stock_complete', sp.stock_complete
            )
        ) AS products
        FROM public.supplier_products sp
        JOIN public.products p ON sp.product_id = p.id
        WHERE sp.supplier_id = s.id
          AND sp.is_available = true
          AND p.is_active = true
    ) prod_agg ON true
    WHERE z.is_active = true
      AND s.status = 'active'
      AND (p_town_id IS NULL OR z.town_id = p_town_id)
      AND ST_Contains(z.boundary, v_point);

    RETURN jsonb_build_object(
        'is_covered', (v_results IS NOT NULL AND jsonb_array_length(v_results) > 0),
        'coordinates', jsonb_build_object('lat', p_lat, 'lng', p_lng),
        'supplier_count', COALESCE(jsonb_array_length(v_results), 0),
        'suppliers', COALESCE(v_results, '[]'::jsonb)
    );
END;
$$;

-- 7.2 Authoritative Order Validation Function
CREATE OR REPLACE FUNCTION public.validate_order_submission(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_supplier_id UUID,
    p_subtotal NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_point GEOMETRY;
    v_zone RECORD;
    v_supplier RECORD;
BEGIN
    v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    -- Check supplier status
    SELECT * INTO v_supplier
    FROM public.supplier_businesses
    WHERE id = p_supplier_id;

    IF v_supplier IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Supplier not found.');
    END IF;

    IF v_supplier.status != 'active' THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Supplier is not currently active.');
    END IF;

    -- Find matching delivery zone for this specific supplier
    SELECT * INTO v_zone
    FROM public.delivery_zones
    WHERE supplier_id = p_supplier_id
      AND is_active = true
      AND ST_Contains(boundary, v_point)
    LIMIT 1;

    IF v_zone IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false, 
            'error', 'Selected delivery destination is not within this supplier''s active delivery zone.'
        );
    END IF;

    -- Check minimum order value
    IF p_subtotal < v_zone.min_order_value THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', format('Order subtotal of KSh %s is below supplier''s minimum order value of KSh %s.', p_subtotal, v_zone.min_order_value)
        );
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'zone_id', v_zone.id,
        'zone_name', v_zone.name,
        'delivery_fee', v_zone.base_delivery_fee,
        'estimated_delivery_min', v_zone.estimated_delivery_min
    );
END;
$$;

-- ==============================================================================
-- 8. Seed Reference Master Towns & Common Products
-- ==============================================================================

-- 8.1 Towns
INSERT INTO public.towns (id, name, county, center_point) VALUES
    ('nairobi', 'Nairobi', 'Nairobi County', ST_SetSRID(ST_MakePoint(36.8219, -1.2921), 4326)),
    ('mombasa', 'Mombasa', 'Mombasa County', ST_SetSRID(ST_MakePoint(39.6682, -4.0435), 4326)),
    ('kisumu', 'Kisumu', 'Kisumu County', ST_SetSRID(ST_MakePoint(34.7680, -0.0917), 4326)),
    ('nakuru', 'Nakuru', 'Nakuru County', ST_SetSRID(ST_MakePoint(36.0663, -0.3031), 4326)),
    ('eldoret', 'Eldoret', 'Uasin Gishu County', ST_SetSRID(ST_MakePoint(35.2698, 0.5143), 4326))
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    county = EXCLUDED.county,
    center_point = EXCLUDED.center_point;

-- 8.2 Master Catalog Products (Official EPRA Standards)
INSERT INTO public.products (brand, cylinder_size, valve_type, tare_weight_kg, description) VALUES
    ('K-Gas', '6kg', '20mm Compact', 8.2, 'Rubis Energy K-Gas 6kg LPG Cylinder with safety seal'),
    ('K-Gas', '13kg', '20mm Compact', 14.5, 'Rubis Energy K-Gas 13kg Household LPG Cylinder'),
    ('K-Gas', '29kg', '20mm Compact', 26.0, 'Rubis Energy K-Gas 29kg Commercial LPG Cylinder'),
    ('TotalEnergies', '6kg', '20mm Compact', 8.0, 'TotalEnergies Totalgaz 6kg Portable LPG Cylinder'),
    ('TotalEnergies', '13kg', '20mm Compact', 14.2, 'TotalEnergies Totalgaz 13kg Household Cylinder'),
    ('TotalEnergies', '29kg', '20mm Compact', 25.8, 'TotalEnergies Totalgaz 29kg Commercial Cylinder'),
    ('Rubis Gas', '6kg', '20mm Compact', 8.1, 'Rubis Gas 6kg with calibrated tare weight'),
    ('Rubis Gas', '13kg', '20mm Compact', 14.3, 'Rubis Gas 13kg Household LPG Cylinder'),
    ('Hass Gas', '6kg', '20mm Compact', 8.0, 'Hass Petroleum 6kg Clean Energy LPG Cylinder'),
    ('Hass Gas', '13kg', '20mm Compact', 14.1, 'Hass Petroleum 13kg Domestic LPG Cylinder'),
    ('Afrigas', '6kg', '20mm Compact', 8.1, 'Vivo Energy Shell Afrigas 6kg Cylinder'),
    ('Afrigas', '13kg', '20mm Compact', 14.4, 'Vivo Energy Shell Afrigas 13kg Domestic Cylinder'),
    ('Lake Gas', '6kg', '20mm Compact', 8.2, 'Lake Gas 6kg LPG Domestic Cylinder'),
    ('Lake Gas', '13kg', '20mm Compact', 14.6, 'Lake Gas 13kg LPG Domestic Cylinder')
ON CONFLICT (brand, cylinder_size, valve_type) DO NOTHING;
