-- ==============================================================================
-- Ooh Gas: Clean Database Reset & Multi-Supplier Migration Runner
-- Use this script in your Supabase SQL Editor if you previously created
-- tables with the earlier schema and encountered:
-- "ERROR: 42703: column 'supplier_id' does not exist"
-- ==============================================================================

-- Drop old tables from the previous prototype in reverse dependency order
DROP TABLE IF EXISTS public.deliveries CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.customer_addresses CASCADE;
DROP TABLE IF EXISTS public.supplier_products CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.zone_supplier_configs CASCADE;
DROP TABLE IF EXISTS public.delivery_zones CASCADE;
DROP TABLE IF EXISTS public.supplier_memberships CASCADE;
DROP TABLE IF EXISTS public.supplier_businesses CASCADE;
DROP TABLE IF EXISTS public.towns CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop obsolete functions if they exist
DROP FUNCTION IF EXISTS public.check_delivery_coverage(DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.find_suppliers_by_location(DOUBLE PRECISION, DOUBLE PRECISION, TEXT);
DROP FUNCTION IF EXISTS public.validate_order_submission(DOUBLE PRECISION, DOUBLE PRECISION, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_supplier_member(UUID);
DROP FUNCTION IF EXISTS public.is_supplier_manager_or_owner(UUID);

-- Drop obsolete types so they can be freshly created
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.supplier_member_role CASCADE;
DROP TYPE IF EXISTS public.supplier_status CASCADE;
DROP TYPE IF EXISTS public.cylinder_size CASCADE;
DROP TYPE IF EXISTS public.purchase_type CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.delivery_status CASCADE;
