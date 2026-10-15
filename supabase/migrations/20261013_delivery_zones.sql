-- =======================================================================
-- Ooh Gas - Delivery Zones & PostGIS Spatial Coverage Schema (Supabase)
-- =======================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Delivery Zones Table with Geographic Polygon
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#10b981',
    is_active BOOLEAN NOT NULL DEFAULT true,
    -- Store geometric polygon in WGS84 (SRID 4326)
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Spatial GIST Index for Sub-Millisecond Point-in-Polygon Lookups
CREATE INDEX IF NOT EXISTS idx_delivery_zones_boundary 
    ON public.delivery_zones USING GIST (boundary);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_is_active 
    ON public.delivery_zones (is_active);

-- 4. Supplier Zone Bindings & Pricing Configuration
CREATE TABLE IF NOT EXISTS public.zone_supplier_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id TEXT NOT NULL REFERENCES public.delivery_zones(id) ON DELETE CASCADE,
    supplier_id TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
    opens_at TIME NOT NULL DEFAULT '07:30',
    closes_at TIME NOT NULL DEFAULT '21:30',
    estimated_delivery_min TEXT NOT NULL DEFAULT '20–30 min',
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(zone_id, supplier_id)
);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_supplier_configs ENABLE ROW LEVEL SECURITY;

-- Anonymous/Authenticated customers can read active zones
CREATE POLICY "Public read active delivery zones"
    ON public.delivery_zones
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public read active zone suppliers"
    ON public.zone_supplier_configs
    FOR SELECT
    USING (is_available = true);

-- Admins (using service role or admin claim) have full CRUD
CREATE POLICY "Admins full management on delivery zones"
    ON public.delivery_zones
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

CREATE POLICY "Admins full management on zone suppliers"
    ON public.zone_supplier_configs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

-- 6. Stored Function: Authoritative Server-Side Coverage Check via PostGIS
CREATE OR REPLACE FUNCTION public.check_delivery_coverage(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_point GEOMETRY;
    v_matched_zones JSONB;
    v_eligible_suppliers JSONB;
    v_is_covered BOOLEAN := false;
BEGIN
    -- Construct geographic point in SRID 4326 (lng, lat)
    v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    -- Find matching active zones
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', z.id,
            'name', z.name,
            'description', z.description,
            'color', z.color,
            'is_active', z.is_active
        )
    )
    INTO v_matched_zones
    FROM public.delivery_zones z
    WHERE z.is_active = true
      AND ST_Contains(z.boundary, v_point);

    IF v_matched_zones IS NOT NULL AND jsonb_array_length(v_matched_zones) > 0 THEN
        v_is_covered := true;

        -- Fetch eligible suppliers for the matching zones
        SELECT jsonb_agg(
            jsonb_build_object(
                'supplier_id', s.supplier_id,
                'zone_id', s.zone_id,
                'delivery_fee', s.delivery_fee,
                'min_order_value', s.min_order_value,
                'opens_at', s.opens_at,
                'closes_at', s.closes_at,
                'estimated_delivery_min', s.estimated_delivery_min
            )
        )
        INTO v_eligible_suppliers
        FROM public.zone_supplier_configs s
        JOIN public.delivery_zones z ON s.zone_id = z.id
        WHERE z.is_active = true
          AND s.is_available = true
          AND ST_Contains(z.boundary, v_point);
    END IF;

    RETURN jsonb_build_object(
        'is_covered', v_is_covered,
        'coordinates', jsonb_build_object('lat', p_lat, 'lng', p_lng),
        'matched_zones', COALESCE(v_matched_zones, '[]'::jsonb),
        'eligible_suppliers', COALESCE(v_eligible_suppliers, '[]'::jsonb),
        'message', CASE 
            WHEN v_is_covered THEN 'Doorstep delivery is available at your location!'
            ELSE 'Location is outside active delivery zones.'
        END
    );
END;
$$;
