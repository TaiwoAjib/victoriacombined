-- SQL Migration Script
-- Purpose: Update salon_settings table with new columns

-- 1. Add customer_module_enabled (for toggling customer features)
ALTER TABLE "salon_settings" 
ADD COLUMN IF NOT EXISTS "customer_module_enabled" BOOLEAN NOT NULL DEFAULT true;

-- 2. Add show_faq_section (for toggling FAQ section visibility)
ALTER TABLE "salon_settings" 
ADD COLUMN IF NOT EXISTS "show_faq_section" BOOLEAN NOT NULL DEFAULT true;

-- 3. Add courtesy_notice (for displaying notices like "24h cancellation policy")
ALTER TABLE "salon_settings" 
ADD COLUMN IF NOT EXISTS "courtesy_notice" TEXT;

-- 4. Verify the changes
-- SELECT * FROM salon_settings LIMIT 1;
