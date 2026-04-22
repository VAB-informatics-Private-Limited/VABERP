-- ============================================================
-- Spare Parts ↔ Machinery Integration - SQL Migration
-- Run on: psql -h localhost -p 2263 -U postgres -d vab_enterprise -f spare_parts.sql
-- ============================================================

-- ─── spare_parts (parts catalog) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spare_parts (
  id             SERIAL PRIMARY KEY,
  enterprise_id  INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  part_code      VARCHAR(64) NOT NULL,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  oem_part_no    VARCHAR(128),
  alt_part_no    VARCHAR(128),
  manufacturer   VARCHAR(255),
  unit           VARCHAR(32) NOT NULL DEFAULT 'pcs',
  current_stock  NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_stock      NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_price     NUMERIC(14,2) NOT NULL DEFAULT 0,
  supplier_id    INT REFERENCES suppliers(id) ON DELETE SET NULL,
  status         VARCHAR(16) NOT NULL DEFAULT 'active',
  created_by     INT REFERENCES employees(id) ON DELETE SET NULL,
  created_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_spare_parts_code UNIQUE (enterprise_id, part_code)
);

CREATE INDEX IF NOT EXISTS ix_spare_parts_enterprise ON spare_parts(enterprise_id);
CREATE INDEX IF NOT EXISTS ix_spare_parts_name       ON spare_parts(enterprise_id, lower(name));
CREATE INDEX IF NOT EXISTS ix_spare_parts_oem        ON spare_parts(enterprise_id, oem_part_no);
CREATE INDEX IF NOT EXISTS ix_spare_parts_status     ON spare_parts(enterprise_id, status);

-- ─── machine_spare_map (template mapping) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS machine_spare_map (
  id                SERIAL PRIMARY KEY,
  enterprise_id     INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  spare_part_id     INT NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
  model_number      VARCHAR(128),
  category_id       INT REFERENCES machine_categories(id) ON DELETE CASCADE,
  default_quantity  NUMERIC(12,2) NOT NULL DEFAULT 1,
  is_mandatory      BOOLEAN NOT NULL DEFAULT FALSE,
  notes             TEXT,
  priority          SMALLINT NOT NULL DEFAULT 100,
  created_by        INT REFERENCES employees(id) ON DELETE SET NULL,
  created_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- At least one scope key must be set
  CONSTRAINT chk_map_scope CHECK (model_number IS NOT NULL OR category_id IS NOT NULL)
);

-- Prevent duplicate template entries per scope (partial unique indexes work on all PG versions)
CREATE UNIQUE INDEX IF NOT EXISTS uq_map_model
  ON machine_spare_map(enterprise_id, model_number, spare_part_id)
  WHERE model_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_map_category
  ON machine_spare_map(enterprise_id, category_id, spare_part_id)
  WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_map_model    ON machine_spare_map(enterprise_id, model_number);
CREATE INDEX IF NOT EXISTS ix_map_category ON machine_spare_map(enterprise_id, category_id);
CREATE INDEX IF NOT EXISTS ix_map_spare    ON machine_spare_map(spare_part_id);

-- ─── machine_spares (parts attached to a specific machine) ────────────────
CREATE TABLE IF NOT EXISTS machine_spares (
  id             SERIAL PRIMARY KEY,
  enterprise_id  INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  machine_id     INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  spare_part_id  INT NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  quantity       NUMERIC(12,2) NOT NULL DEFAULT 1,
  source         VARCHAR(24) NOT NULL DEFAULT 'manual',
  notes          TEXT,
  created_by     INT REFERENCES employees(id) ON DELETE SET NULL,
  created_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_machine_spares UNIQUE (machine_id, spare_part_id)
);

CREATE INDEX IF NOT EXISTS ix_machine_spares_machine    ON machine_spares(machine_id);
CREATE INDEX IF NOT EXISTS ix_machine_spares_spare      ON machine_spares(spare_part_id);
CREATE INDEX IF NOT EXISTS ix_machine_spares_enterprise ON machine_spares(enterprise_id);
