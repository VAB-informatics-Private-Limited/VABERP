-- ─── Waste Management Migration ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waste_categories (
  id                SERIAL PRIMARY KEY,
  enterprise_id     INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name              VARCHAR NOT NULL,
  code              VARCHAR NOT NULL,
  classification    VARCHAR NOT NULL DEFAULT 'general',
  unit              VARCHAR NOT NULL DEFAULT 'kg',
  requires_manifest BOOLEAN NOT NULL DEFAULT FALSE,
  max_storage_days  INT,
  handling_notes    TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enterprise_id, code)
);

CREATE TABLE IF NOT EXISTS waste_sources (
  id              SERIAL PRIMARY KEY,
  enterprise_id   INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name            VARCHAR NOT NULL,
  source_type     VARCHAR NOT NULL DEFAULT 'department',
  reference_id    INT,
  reference_type  VARCHAR,
  location        VARCHAR,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waste_inventory (
  id                    SERIAL PRIMARY KEY,
  enterprise_id         INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  batch_no              VARCHAR NOT NULL,
  category_id           INT NOT NULL REFERENCES waste_categories(id),
  source_id             INT REFERENCES waste_sources(id) ON DELETE SET NULL,
  quantity_generated    DECIMAL(14,3) NOT NULL,
  quantity_available    DECIMAL(14,3) NOT NULL,
  quantity_reserved     DECIMAL(14,3) NOT NULL DEFAULT 0,
  unit                  VARCHAR NOT NULL DEFAULT 'kg',
  storage_location      VARCHAR,
  storage_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_alert_date     DATE,
  status                VARCHAR NOT NULL DEFAULT 'available',
  manifest_number       VARCHAR,
  hazard_level          VARCHAR,
  estimated_value       DECIMAL(14,2),
  work_order_id         INT,
  production_job_id     INT,
  entered_by            INT REFERENCES employees(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enterprise_id, batch_no),
  CONSTRAINT chk_qty_available CHECK (quantity_available >= 0),
  CONSTRAINT chk_qty_reserved CHECK (quantity_reserved >= 0),
  CONSTRAINT chk_qty_logic CHECK (quantity_available + quantity_reserved <= quantity_generated)
);

CREATE INDEX IF NOT EXISTS idx_waste_inv_enterprise ON waste_inventory(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_waste_inv_category ON waste_inventory(category_id);
CREATE INDEX IF NOT EXISTS idx_waste_inv_status ON waste_inventory(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_waste_inv_expiry ON waste_inventory(expiry_alert_date);

CREATE TABLE IF NOT EXISTS waste_inventory_log (
  id              SERIAL PRIMARY KEY,
  inventory_id    INT NOT NULL REFERENCES waste_inventory(id) ON DELETE CASCADE,
  action          VARCHAR NOT NULL,
  quantity_delta  DECIMAL(14,3) NOT NULL,
  quantity_after  DECIMAL(14,3) NOT NULL,
  reference_type  VARCHAR,
  reference_id    INT,
  performed_by    INT REFERENCES employees(id) ON DELETE SET NULL,
  notes           TEXT,
  created_date    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_inv_log ON waste_inventory_log(inventory_id);

CREATE TABLE IF NOT EXISTS waste_parties (
  id                    SERIAL PRIMARY KEY,
  enterprise_id         INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  party_code            VARCHAR NOT NULL,
  company_name          VARCHAR NOT NULL,
  party_type            VARCHAR NOT NULL DEFAULT 'vendor',
  contact_person        VARCHAR,
  phone                 VARCHAR,
  email                 VARCHAR,
  address               TEXT,
  gst_number            VARCHAR,
  pollution_board_cert  VARCHAR,
  cert_expiry_date      DATE,
  handles_hazardous     BOOLEAN NOT NULL DEFAULT FALSE,
  payment_terms         VARCHAR NOT NULL DEFAULT 'immediate',
  status                VARCHAR NOT NULL DEFAULT 'active',
  rating                DECIMAL(3,1),
  notes                 TEXT,
  created_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enterprise_id, party_code)
);

CREATE TABLE IF NOT EXISTS waste_party_rates (
  id              SERIAL PRIMARY KEY,
  party_id        INT NOT NULL REFERENCES waste_parties(id) ON DELETE CASCADE,
  category_id     INT NOT NULL REFERENCES waste_categories(id) ON DELETE CASCADE,
  rate_type       VARCHAR NOT NULL,
  rate            DECIMAL(14,4) NOT NULL,
  currency        VARCHAR NOT NULL DEFAULT 'INR',
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE,
  created_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(party_id, category_id, rate_type, effective_from)
);

CREATE TABLE IF NOT EXISTS waste_disposal_transactions (
  id                SERIAL PRIMARY KEY,
  enterprise_id     INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  transaction_no    VARCHAR NOT NULL,
  party_id          INT NOT NULL REFERENCES waste_parties(id),
  transaction_type  VARCHAR NOT NULL DEFAULT 'disposal',
  disposal_method   VARCHAR,
  status            VARCHAR NOT NULL DEFAULT 'draft',
  scheduled_date    DATE NOT NULL,
  completed_date    DATE,
  total_quantity    DECIMAL(14,3) NOT NULL DEFAULT 0,
  total_revenue     DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_cost        DECIMAL(14,2) NOT NULL DEFAULT 0,
  manifest_number   VARCHAR,
  vehicle_number    VARCHAR,
  driver_name       VARCHAR,
  approved_by       INT REFERENCES employees(id) ON DELETE SET NULL,
  created_by        INT REFERENCES employees(id) ON DELETE SET NULL,
  notes             TEXT,
  created_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enterprise_id, transaction_no)
);

CREATE INDEX IF NOT EXISTS idx_wdt_enterprise ON waste_disposal_transactions(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_wdt_status ON waste_disposal_transactions(enterprise_id, status);

CREATE TABLE IF NOT EXISTS waste_disposal_lines (
  id                  SERIAL PRIMARY KEY,
  transaction_id      INT NOT NULL REFERENCES waste_disposal_transactions(id) ON DELETE CASCADE,
  inventory_id        INT NOT NULL REFERENCES waste_inventory(id),
  category_id         INT NOT NULL REFERENCES waste_categories(id),
  quantity_requested  DECIMAL(14,3) NOT NULL,
  quantity_actual     DECIMAL(14,3),
  unit                VARCHAR NOT NULL DEFAULT 'kg',
  rate                DECIMAL(14,4),
  revenue             DECIMAL(14,2) NOT NULL DEFAULT 0,
  cost                DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  CONSTRAINT chk_qty_req_positive CHECK (quantity_requested > 0),
  CONSTRAINT chk_qty_actual_nn CHECK (quantity_actual IS NULL OR quantity_actual >= 0)
);

CREATE INDEX IF NOT EXISTS idx_wdl_transaction ON waste_disposal_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_wdl_inventory ON waste_disposal_lines(inventory_id);
