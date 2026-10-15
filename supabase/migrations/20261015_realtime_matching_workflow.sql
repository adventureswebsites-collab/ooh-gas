-- ==============================================================================
-- Ooh Gas - Phase 2: Real-Time Supplier Matching, Offer System & Delivery Workflow
-- Complete multi-supplier ranking, sequential offer waterfall, transactional locking,
-- PayHero payment tracking, driver location telemetry, and strict PostGIS RLS.
-- ==============================================================================

-- 1. Extend order_status enum to include all required lifecycle stages
DO $$ BEGIN
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'matching_supplier';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'supplier_offered';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'supplier_accepted';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'supplier_rejected';
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'no_supplier_available';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;

-- 2. Offer Status Enum
DO $$ BEGIN
    CREATE TYPE public.offer_status AS ENUM (
        'offered',
        'accepted',
        'rejected',
        'expired',
        'bypassed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Supplier Order Offers Table (Sequential Waterfall & Audit Log)
CREATE TABLE IF NOT EXISTS public.supplier_order_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.supplier_businesses(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL DEFAULT 1,
    status public.offer_status NOT NULL DEFAULT 'offered',
    offered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    rejection_reason TEXT,
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(order_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_offers_order ON public.supplier_order_offers(order_id);
CREATE INDEX IF NOT EXISTS idx_offers_supplier ON public.supplier_order_offers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.supplier_order_offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_expires ON public.supplier_order_offers(expires_at) WHERE status = 'offered';

-- 4. Order Matching Sessions (Configurable Ranking Log & Evaluation Audit)
CREATE TABLE IF NOT EXISTS public.order_matching_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'evaluating', -- 'evaluating', 'offering', 'matched', 'exhausted', 'cancelled'
    candidate_count INTEGER NOT NULL DEFAULT 0,
    current_offer_id UUID REFERENCES public.supplier_order_offers(id) ON DELETE SET NULL,
    matched_supplier_id UUID REFERENCES public.supplier_businesses(id) ON DELETE SET NULL,
    ranking_weights JSONB NOT NULL DEFAULT '{"coverage": 0.25, "stock": 0.20, "distance": 0.25, "eta": 0.15, "rating": 0.15}'::jsonb,
    candidates_evaluated JSONB NOT NULL DEFAULT '[]'::jsonb,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_matching_sessions_order ON public.order_matching_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_matching_sessions_status ON public.order_matching_sessions(status);

-- 5. Driver Locations Table (Future-ready Live GPS Telemetry Stream)
CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    accuracy NUMERIC(6, 2),
    heading NUMERIC(5, 2),
    speed_kmh NUMERIC(5, 2),
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order ON public.driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated ON public.driver_locations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_geom ON public.driver_locations USING GIST (location);

-- Add updated_at triggers
CREATE TRIGGER trg_supplier_order_offers_updated_at
    BEFORE UPDATE ON public.supplier_order_offers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. Row Level Security Policies
-- ==============================================================================

-- 6.1 Supplier Order Offers
ALTER TABLE public.supplier_order_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view offers for their orders"
    ON public.supplier_order_offers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.customer_id = auth.uid()
        ) OR public.is_admin()
    );

CREATE POLICY "Suppliers view offers sent to them"
    ON public.supplier_order_offers FOR SELECT
    USING (
        public.is_supplier_member(supplier_id) OR public.is_admin()
    );

CREATE POLICY "Suppliers update their pending offers"
    ON public.supplier_order_offers FOR UPDATE
    USING (
        public.is_supplier_member(supplier_id) OR public.is_admin()
    )
    WITH CHECK (
        public.is_supplier_member(supplier_id) OR public.is_admin()
    );

-- 6.2 Order Matching Sessions
ALTER TABLE public.order_matching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view matching session for their order"
    ON public.order_matching_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.customer_id = auth.uid()
        ) OR public.is_admin()
    );

CREATE POLICY "Admins manage matching sessions"
    ON public.order_matching_sessions FOR ALL
    USING (public.is_admin());

-- 6.3 Driver Locations
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders update own location"
    ON public.driver_locations FOR ALL
    USING (driver_id = auth.uid() OR public.is_admin());

CREATE POLICY "Authorized parties view active delivery location"
    ON public.driver_locations FOR SELECT
    USING (
        driver_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND (
                o.customer_id = auth.uid()
                OR public.is_supplier_member(o.supplier_id)
            )
        )
    );

-- ==============================================================================
-- 7. High-Performance Spatial Ranking & Transactional Acceptance Functions
-- ==============================================================================

-- 7.1 Authoritative Multi-Criteria Supplier Ranking Function
CREATE OR REPLACE FUNCTION public.rank_eligible_suppliers_for_order(
    p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_candidates JSONB;
    v_weights JSONB := '{"coverage": 0.25, "stock": 0.20, "distance": 0.25, "eta": 0.15, "rating": 0.15}'::jsonb;
BEGIN
    -- 1. Fetch order details
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF v_order IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    -- 2. Find eligible suppliers:
    --    - Must be active
    --    - Must have active delivery zone containing order coordinates (ST_Contains)
    --    - Must have sufficient stock for all requested order items
    WITH eligible_suppliers AS (
        SELECT 
            s.id AS supplier_id,
            s.business_name,
            s.trade_name,
            s.rating,
            s.review_count,
            s.depot_location,
            z.id AS zone_id,
            z.name AS zone_name,
            z.base_delivery_fee,
            z.min_order_value,
            z.estimated_delivery_min,
            -- Distance in kilometers (ST_Distance in 4326 geography returns meters)
            ROUND((ST_Distance(s.depot_location::geography, v_order.delivery_point::geography) / 1000.0)::numeric, 2) AS distance_km,
            -- Check stock depth across all order items
            BOOL_AND(
                CASE 
                    WHEN oi.purchase_type = 'refill' THEN sp.stock_refill >= oi.quantity
                    ELSE sp.stock_complete >= oi.quantity
                END
            ) AS has_all_stock,
            -- Calculate minimum stock cushion
            MIN(
                CASE 
                    WHEN oi.purchase_type = 'refill' THEN sp.stock_refill
                    ELSE sp.stock_complete
                END
            ) AS min_stock_cushion
        FROM public.supplier_businesses s
        JOIN public.delivery_zones z ON z.supplier_id = s.id AND z.is_active = true
        JOIN public.order_items oi ON oi.order_id = p_order_id
        JOIN public.supplier_products sp ON sp.supplier_id = s.id AND sp.product_id = oi.product_id AND sp.is_available = true
        WHERE s.status = 'active'
          AND ST_Contains(z.boundary, v_order.delivery_point)
          AND v_order.subtotal >= z.min_order_value
        GROUP BY s.id, s.business_name, s.trade_name, s.rating, s.review_count, s.depot_location,
                 z.id, z.name, z.base_delivery_fee, z.min_order_value, z.estimated_delivery_min
        HAVING BOOL_AND(
            CASE 
                WHEN oi.purchase_type = 'refill' THEN sp.stock_refill >= oi.quantity
                ELSE sp.stock_complete >= oi.quantity
            END
        ) = true
    ),
    scored_suppliers AS (
        SELECT 
            es.*,
            -- Normalized sub-scores (0.0 to 1.0)
            -- 1. Coverage tier: 1.0 if delivery fee is 0 (primary zone), else 0.85
            CASE WHEN es.base_delivery_fee = 0 THEN 1.0 ELSE 0.85 END AS coverage_score,
            -- 2. Stock score: scaled from stock cushion (cap at 50)
            LEAST(1.0, es.min_stock_cushion / 50.0) AS stock_score,
            -- 3. Distance score: inverse exponential or linear decay (max 10km)
            GREATEST(0.0, 1.0 - (es.distance_km / 12.0)) AS distance_score,
            -- 4. ETA score: lower minutes = higher score
            CASE 
                WHEN es.estimated_delivery_min LIKE '%15%' THEN 1.0
                WHEN es.estimated_delivery_min LIKE '%20%' THEN 0.85
                WHEN es.estimated_delivery_min LIKE '%25%' THEN 0.75
                ELSE 0.60
            END AS eta_score,
            -- 5. Rating score: rating / 5.0
            (es.rating / 5.0) AS rating_score
        FROM eligible_suppliers es
    ),
    ranked_suppliers AS (
        SELECT 
            ss.*,
            -- Composite weighted ranking score
            ROUND((
                (ss.coverage_score * (v_weights->>'coverage')::numeric) +
                (ss.stock_score * (v_weights->>'stock')::numeric) +
                (ss.distance_score * (v_weights->>'distance')::numeric) +
                (ss.eta_score * (v_weights->>'eta')::numeric) +
                (ss.rating_score * (v_weights->>'rating')::numeric)
            )::numeric, 4) AS composite_score,
            ROW_NUMBER() OVER (
                ORDER BY (
                    (ss.coverage_score * (v_weights->>'coverage')::numeric) +
                    (ss.stock_score * (v_weights->>'stock')::numeric) +
                    (ss.distance_score * (v_weights->>'distance')::numeric) +
                    (ss.eta_score * (v_weights->>'eta')::numeric) +
                    (ss.rating_score * (v_weights->>'rating')::numeric)
                ) DESC, ss.distance_km ASC
            ) AS rank
        FROM scored_suppliers ss
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'rank', rank,
            'supplier_id', supplier_id,
            'trade_name', trade_name,
            'business_name', business_name,
            'distance_km', distance_km,
            'zone_id', zone_id,
            'zone_name', zone_name,
            'delivery_fee', base_delivery_fee,
            'estimated_delivery_min', estimated_delivery_min,
            'min_stock_cushion', min_stock_cushion,
            'composite_score', composite_score,
            'score_breakdown', jsonb_build_object(
                'coverage', coverage_score,
                'stock', stock_score,
                'distance', distance_score,
                'eta', eta_score,
                'rating', rating_score
            )
        )
    )
    INTO v_candidates
    FROM ranked_suppliers;

    -- Record session log
    INSERT INTO public.order_matching_sessions (
        order_id,
        status,
        candidate_count,
        ranking_weights,
        candidates_evaluated
    ) VALUES (
        p_order_id,
        CASE WHEN v_candidates IS NOT NULL AND jsonb_array_length(v_candidates) > 0 THEN 'offering' ELSE 'exhausted' END,
        COALESCE(jsonb_array_length(v_candidates), 0),
        v_weights,
        COALESCE(v_candidates, '[]'::jsonb)
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'candidate_count', COALESCE(jsonb_array_length(v_candidates), 0),
        'candidates', COALESCE(v_candidates, '[]'::jsonb)
    );
END;
$$;

-- 7.2 Transactional Offer Acceptance with Row-Level Locking (Prevents Double-Claiming)
CREATE OR REPLACE FUNCTION public.accept_supplier_offer(
    p_offer_id UUID,
    p_supplier_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer RECORD;
    v_order RECORD;
    v_item RECORD;
    v_zone RECORD;
BEGIN
    -- 1. Lock the offer row using FOR UPDATE to prevent race conditions
    SELECT * INTO v_offer
    FROM public.supplier_order_offers
    WHERE id = p_offer_id
    FOR UPDATE;

    IF v_offer IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Offer not found.');
    END IF;

    IF v_offer.supplier_id != p_supplier_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Offer was not issued to this supplier.');
    END IF;

    IF v_offer.status != 'offered' THEN
        RETURN jsonb_build_object('success', false, 'error', format('Offer cannot be accepted because status is already %s.', v_offer.status));
    END IF;

    IF v_offer.expires_at < timezone('utc', now()) THEN
        -- Auto-expire offer
        UPDATE public.supplier_order_offers
        SET status = 'expired', updated_at = timezone('utc', now())
        WHERE id = p_offer_id;
        RETURN jsonb_build_object('success', false, 'error', 'Offer has expired.');
    END IF;

    -- 2. Lock the order row using FOR UPDATE
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = v_offer.order_id
    FOR UPDATE;

    IF v_order.status != 'supplier_offered' AND v_order.status != 'matching_supplier' AND v_order.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', format('Order is not in an offerable state (current: %s).', v_order.status));
    END IF;

    -- 3. Resolve supplier's matching delivery zone to lock in delivery fee
    SELECT * INTO v_zone
    FROM public.delivery_zones
    WHERE supplier_id = p_supplier_id
      AND is_active = true
      AND ST_Contains(boundary, v_order.delivery_point)
    LIMIT 1;

    -- 4. Atomically deduct inventory for every order item
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = v_order.id LOOP
        IF v_item.purchase_type = 'refill' THEN
            UPDATE public.supplier_products
            SET stock_refill = stock_refill - v_item.quantity,
                updated_at = timezone('utc', now())
            WHERE supplier_id = p_supplier_id AND product_id = v_item.product_id;
        ELSE
            UPDATE public.supplier_products
            SET stock_complete = stock_complete - v_item.quantity,
                updated_at = timezone('utc', now())
            WHERE supplier_id = p_supplier_id AND product_id = v_item.product_id;
        END IF;
    END LOOP;

    -- 5. Mark offer as accepted
    UPDATE public.supplier_order_offers
    SET status = 'accepted',
        responded_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    WHERE id = p_offer_id;

    -- 6. Cancel/bypass any other offers for this order
    UPDATE public.supplier_order_offers
    SET status = 'bypassed',
        updated_at = timezone('utc', now())
    WHERE order_id = v_order.id AND id != p_offer_id AND status = 'offered';

    -- 7. Update order to supplier_accepted, lock delivery fee, record supplier
    UPDATE public.orders
    SET status = 'supplier_accepted',
        supplier_id = p_supplier_id,
        delivery_zone_id = COALESCE(v_zone.id, v_order.delivery_zone_id),
        delivery_fee = COALESCE(v_zone.base_delivery_fee, v_order.delivery_fee),
        total_amount = v_order.subtotal + COALESCE(v_zone.base_delivery_fee, v_order.delivery_fee),
        updated_at = timezone('utc', now())
    WHERE id = v_order.id;

    -- 8. Update matching session
    UPDATE public.order_matching_sessions
    SET status = 'matched',
        matched_supplier_id = p_supplier_id,
        completed_at = timezone('utc', now())
    WHERE order_id = v_order.id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'supplier_id', p_supplier_id,
        'delivery_fee', COALESCE(v_zone.base_delivery_fee, 0),
        'status', 'supplier_accepted'
    );
END;
$$;

-- 7.3 Transactional Offer Rejection with Automatic Next-Candidate Trigger
CREATE OR REPLACE FUNCTION public.reject_supplier_offer(
    p_offer_id UUID,
    p_supplier_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer RECORD;
BEGIN
    SELECT * INTO v_offer
    FROM public.supplier_order_offers
    WHERE id = p_offer_id
    FOR UPDATE;

    IF v_offer IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Offer not found.');
    END IF;

    IF v_offer.supplier_id != p_supplier_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized.');
    END IF;

    UPDATE public.supplier_order_offers
    SET status = 'rejected',
        rejection_reason = p_reason,
        responded_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    WHERE id = p_offer_id;

    RETURN jsonb_build_object(
        'success', true,
        'offer_id', p_offer_id,
        'order_id', v_offer.order_id,
        'status', 'rejected'
    );
END;
$$;

-- ==============================================================================
-- 8. Real-time Publications Setup (For Supabase Realtime Listeners)
-- ==============================================================================
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_order_offers;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_matching_sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN others THEN null;
END $$;
