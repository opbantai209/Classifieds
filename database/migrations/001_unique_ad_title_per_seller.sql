-- ==============================================================================
-- DATABASE MIGRATION: Duplicate Ad Title Prevention Per User
-- Enforces case-insensitive, whitespace-normalized uniqueness for ad titles per seller
-- ==============================================================================

-- 1. PostgreSQL / CockroachDB / Cloud SQL:
-- Uses functional unique partial index to normalize leading/trailing/multiple spaces and case.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_ad_title_per_seller
ON listings (seller_id, LOWER(REGEXP_REPLACE(TRIM(title), '\s+', ' ', 'g')))
WHERE status NOT IN ('sold', 'deleted');

-- Alternatively, using a generated column for maximum portability & query optimizer usage:
-- ALTER TABLE listings ADD COLUMN IF NOT EXISTS normalized_title VARCHAR(255)
--   GENERATED ALWAYS AS (LOWER(REGEXP_REPLACE(TRIM(title), '\s+', ' ', 'g'))) STORED;
-- CREATE UNIQUE INDEX idx_unique_seller_normalized_title ON listings (seller_id, normalized_title)
--   WHERE status NOT IN ('sold', 'deleted');

-- 2. MySQL / MariaDB (8.0+):
-- Using a functional virtual column and unique index
-- ALTER TABLE listings ADD COLUMN normalized_title VARCHAR(255)
--   AS (LOWER(REGEXP_REPLACE(TRIM(title), '[[:space:]]+', ' '))) STORED;
-- CREATE UNIQUE INDEX uq_seller_active_title ON listings (seller_id, normalized_title);

-- 3. SQLite:
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_seller_title
-- ON listings (seller_id, LOWER(TRIM(title)))
-- WHERE status != 'sold';
