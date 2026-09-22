-- ==============================================================================
-- Migration: 002_boost_your_ad_to_top.sql
-- Description: Schema additions for "Boost Your Ad to Top" feature
-- Includes: Boost metadata, Package configuration table, Orders & Transactions,
-- and ranking query indexes for PostgreSQL, MySQL, and SQLite.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. POSTGRESQL (Production / Cloud SQL)
-- ------------------------------------------------------------------------------

-- Add Boost tracking columns to listings table
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS boost_started_at TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS boost_package_id VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS boost_package_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS boost_status VARCHAR(32) DEFAULT 'inactive' CHECK (boost_status IN ('active', 'expired', 'inactive')),
  ADD COLUMN IF NOT EXISTS boost_payment_id VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS boost_price NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_duration_hours INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_impressions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_clicks INTEGER DEFAULT 0;

-- Composite ranking index: Prioritizes active boosted listings where boost_expires_at > NOW()
CREATE INDEX IF NOT EXISTS idx_listings_boost_ranking
  ON listings (boost_status, boost_expires_at DESC, is_featured, created_at DESC)
  WHERE status = 'approved';

-- Boost Packages table (for dynamic admin-controlled packages & pricing)
CREATE TABLE IF NOT EXISTS boost_packages (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  badge VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'boost',
  duration_days INTEGER NOT NULL DEFAULT 1,
  duration_hours INTEGER NOT NULL DEFAULT 24,
  price NUMERIC(10, 2) NOT NULL,
  discount_price NUMERIC(10, 2) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default initial boost packages
INSERT INTO boost_packages (id, name, badge, type, duration_days, duration_hours, price, discount_price, currency, features, is_active, sales_count)
VALUES
  ('pkg_boost_24h', '24 Hours Instant Top Boost', 'QUICK BOOST', 'boost', 1, 24, 99.00, NULL, 'INR', '["Instant top placement in category feeds", "High-visibility BOOSTED label", "Up to 5x more clicks"]'::jsonb, TRUE, 18),
  ('pkg_boost_3d', '3 Days High-Visibility Boost', 'MOST POPULAR', 'boost', 3, 72, 199.00, 249.00, 'INR', '["Continuous top ranking for 72 hours", "Promoted badge with glowing highlight card", "Up to 8x more verified buyer chat inquiries"]'::jsonb, TRUE, 34),
  ('pkg_boost_7d', '7 Days Maximum Exposure Boost', 'BEST VALUE', 'boost', 7, 168, 399.00, 499.00, 'INR', '["Full 7-day uninterrupted top ranking priority", "Citywide notification alert to active buyers", "Dedicated analytics report"]'::jsonb, TRUE, 22)
ON CONFLICT (id) DO NOTHING;

-- Orders table (Server-side order intent & amount verification)
CREATE TABLE IF NOT EXISTS boost_orders (
  order_id VARCHAR(64) PRIMARY KEY,
  listing_id VARCHAR(64) NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  package_id VARCHAR(64) NOT NULL REFERENCES boost_packages(id),
  user_id VARCHAR(64) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  duration_hours INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order Transactions table (Payment confirmation, invoices, and gateway audit)
CREATE TABLE IF NOT EXISTS boost_transactions (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES boost_orders(order_id),
  listing_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  package_id VARCHAR(64) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_gateway VARCHAR(64) NOT NULL,
  payment_id VARCHAR(128) NOT NULL,
  invoice_number VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_boost_transactions_user ON boost_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_boost_transactions_listing ON boost_transactions(listing_id);

-- ------------------------------------------------------------------------------
-- 2. MYSQL / MARIADB VARIANT
-- ------------------------------------------------------------------------------
/*
ALTER TABLE listings
  ADD COLUMN boost_started_at DATETIME NULL,
  ADD COLUMN boost_expires_at DATETIME NULL,
  ADD COLUMN boost_package_id VARCHAR(64) NULL,
  ADD COLUMN boost_package_name VARCHAR(255) NULL,
  ADD COLUMN boost_status ENUM('active', 'expired', 'inactive') DEFAULT 'inactive',
  ADD COLUMN boost_payment_id VARCHAR(128) NULL,
  ADD COLUMN boost_price DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN boost_duration_hours INT DEFAULT 0,
  ADD COLUMN boost_views INT DEFAULT 0,
  ADD COLUMN boost_impressions INT DEFAULT 0,
  ADD COLUMN boost_clicks INT DEFAULT 0;

CREATE INDEX idx_listings_boost_ranking
  ON listings (boost_status, boost_expires_at, is_featured, created_at);
*/

-- ------------------------------------------------------------------------------
-- 3. SQLITE VARIANT
-- ------------------------------------------------------------------------------
/*
ALTER TABLE listings ADD COLUMN boost_started_at TEXT;
ALTER TABLE listings ADD COLUMN boost_expires_at TEXT;
ALTER TABLE listings ADD COLUMN boost_package_id TEXT;
ALTER TABLE listings ADD COLUMN boost_package_name TEXT;
ALTER TABLE listings ADD COLUMN boost_status TEXT DEFAULT 'inactive';
ALTER TABLE listings ADD COLUMN boost_payment_id TEXT;
ALTER TABLE listings ADD COLUMN boost_price REAL DEFAULT 0;
ALTER TABLE listings ADD COLUMN boost_duration_hours INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN boost_views INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN boost_impressions INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN boost_clicks INTEGER DEFAULT 0;

CREATE INDEX idx_listings_boost_rank ON listings (boost_status, boost_expires_at, is_featured, created_at);
*/
