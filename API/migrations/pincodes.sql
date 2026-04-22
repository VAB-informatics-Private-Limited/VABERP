-- ============================================================
-- Pincodes master (cascading State -> City -> Pincode)
-- ============================================================

CREATE TABLE IF NOT EXISTS pincodes (
  id             SERIAL PRIMARY KEY,
  city_id        INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  code           VARCHAR(10) NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pincodes_city_code UNIQUE (city_id, code)
);

CREATE INDEX IF NOT EXISTS ix_pincodes_city   ON pincodes(city_id);
CREATE INDEX IF NOT EXISTS ix_pincodes_code   ON pincodes(code);
