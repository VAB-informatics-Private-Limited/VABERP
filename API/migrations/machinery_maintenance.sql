-- ============================================================
-- Machinery Maintenance Module - SQL Migration
-- Run on: psql -h localhost -p 2263 -U postgres -d vab_enterprise -f machinery_maintenance.sql
-- ============================================================

-- Machine Categories
CREATE TABLE IF NOT EXISTS machine_categories (
  id            SERIAL PRIMARY KEY,
  enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name          VARCHAR NOT NULL,
  description   TEXT,
  color         VARCHAR,
  created_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Machines
CREATE TABLE IF NOT EXISTS machines (
  id                    SERIAL PRIMARY KEY,
  enterprise_id         INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  machine_code          VARCHAR NOT NULL,
  name                  VARCHAR NOT NULL,
  category_id           INT REFERENCES machine_categories(id) ON DELETE SET NULL,
  make                  VARCHAR,
  model                 VARCHAR,
  serial_number         VARCHAR,
  year_of_manufacture   INT,
  purchase_date         DATE,
  purchase_cost         DECIMAL(14,2),
  location              VARCHAR,
  department            VARCHAR,
  status                VARCHAR NOT NULL DEFAULT 'active',
  criticality           VARCHAR NOT NULL DEFAULT 'medium',
  meter_unit            VARCHAR NOT NULL DEFAULT 'hours',
  current_meter_reading DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes                 TEXT,
  image_url             VARCHAR,
  created_by            INT REFERENCES employees(id) ON DELETE SET NULL,
  created_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enterprise_id, machine_code)
);

-- Machine Meter Logs
CREATE TABLE IF NOT EXISTS machine_meter_logs (
  id             SERIAL PRIMARY KEY,
  machine_id     INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  enterprise_id  INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  reading_value  DECIMAL(12,2) NOT NULL,
  reading_date   DATE NOT NULL,
  source         VARCHAR NOT NULL DEFAULT 'manual',
  recorded_by    INT REFERENCES employees(id) ON DELETE SET NULL,
  notes          TEXT,
  created_date   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance Vendors
CREATE TABLE IF NOT EXISTS maintenance_vendors (
  id                  SERIAL PRIMARY KEY,
  enterprise_id       INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  company_name        VARCHAR NOT NULL,
  contact_person      VARCHAR,
  phone               VARCHAR,
  email               VARCHAR,
  address             TEXT,
  service_categories  JSONB NOT NULL DEFAULT '[]',
  rating              DECIMAL(3,2),
  status              VARCHAR NOT NULL DEFAULT 'active',
  notes               TEXT,
  created_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AMC Contracts
CREATE TABLE IF NOT EXISTS amc_contracts (
  id                  SERIAL PRIMARY KEY,
  enterprise_id       INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  vendor_id           INT NOT NULL REFERENCES maintenance_vendors(id) ON DELETE CASCADE,
  machine_id          INT REFERENCES machines(id) ON DELETE SET NULL,
  category_id         INT REFERENCES machine_categories(id) ON DELETE SET NULL,
  contract_number     VARCHAR,
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  contract_value      DECIMAL(14,2),
  coverage_type       VARCHAR NOT NULL DEFAULT 'comprehensive',
  visit_frequency     INT,
  status              VARCHAR NOT NULL DEFAULT 'active',
  notes               TEXT,
  document_url        VARCHAR,
  created_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendor Performance Logs
CREATE TABLE IF NOT EXISTS vendor_performance_logs (
  id                  SERIAL PRIMARY KEY,
  enterprise_id       INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  vendor_id           INT NOT NULL REFERENCES maintenance_vendors(id) ON DELETE CASCADE,
  work_order_id       INT,
  quality_score       DECIMAL(3,1),
  timeliness_score    DECIMAL(3,1),
  communication_score DECIMAL(3,1),
  delay_days          INT NOT NULL DEFAULT 0,
  feedback            TEXT,
  rated_by            INT REFERENCES employees(id) ON DELETE SET NULL,
  created_date        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BOM Templates
CREATE TABLE IF NOT EXISTS maintenance_bom_templates (
  id            SERIAL PRIMARY KEY,
  enterprise_id INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name          VARCHAR NOT NULL,
  machine_id    INT REFERENCES machines(id) ON DELETE SET NULL,
  category_id   INT REFERENCES machine_categories(id) ON DELETE SET NULL,
  service_type  VARCHAR NOT NULL DEFAULT 'preventive',
  version       INT NOT NULL DEFAULT 1,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_by    INT REFERENCES employees(id) ON DELETE SET NULL,
  created_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BOM Lines
CREATE TABLE IF NOT EXISTS maintenance_bom_lines (
  id                SERIAL PRIMARY KEY,
  template_id       INT NOT NULL REFERENCES maintenance_bom_templates(id) ON DELETE CASCADE,
  raw_material_id   INT NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  quantity_required DECIMAL(10,3) NOT NULL,
  unit              VARCHAR,
  is_mandatory      BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  sort_order        INT NOT NULL DEFAULT 0,
  created_date      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder Rules
CREATE TABLE IF NOT EXISTS maintenance_reminder_rules (
  id                      SERIAL PRIMARY KEY,
  enterprise_id           INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name                    VARCHAR NOT NULL,
  machine_id              INT REFERENCES machines(id) ON DELETE SET NULL,
  category_id             INT REFERENCES machine_categories(id) ON DELETE SET NULL,
  trigger_type            VARCHAR NOT NULL DEFAULT 'time_based',
  interval_days           INT,
  interval_units          DECIMAL(12,2),
  advance_notice_days     INT NOT NULL DEFAULT 7,
  priority                VARCHAR NOT NULL DEFAULT 'medium',
  is_recurring            BOOLEAN NOT NULL DEFAULT TRUE,
  bom_template_id         INT REFERENCES maintenance_bom_templates(id) ON DELETE SET NULL,
  preferred_vendor_id     INT REFERENCES maintenance_vendors(id) ON DELETE SET NULL,
  overdue_notify_after_days INT NOT NULL DEFAULT 1,
  status                  VARCHAR NOT NULL DEFAULT 'active',
  created_by              INT REFERENCES employees(id) ON DELETE SET NULL,
  created_date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance Reminders (instances)
CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id                    SERIAL PRIMARY KEY,
  enterprise_id         INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  rule_id               INT NOT NULL REFERENCES maintenance_reminder_rules(id) ON DELETE CASCADE,
  machine_id            INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  due_date              DATE,
  due_at_meter          DECIMAL(12,2),
  trigger_type          VARCHAR NOT NULL,
  status                VARCHAR NOT NULL DEFAULT 'pending',
  work_order_id         INT,
  snooze_until          DATE,
  snooze_count          INT NOT NULL DEFAULT 0,
  overdue_notified_at   TIMESTAMPTZ,
  created_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance Work Orders
CREATE TABLE IF NOT EXISTS maintenance_work_orders (
  id                        SERIAL PRIMARY KEY,
  enterprise_id             INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  work_order_no             VARCHAR NOT NULL,
  machine_id                INT NOT NULL REFERENCES machines(id),
  reminder_id               INT REFERENCES maintenance_reminders(id) ON DELETE SET NULL,
  service_type              VARCHAR NOT NULL DEFAULT 'preventive',
  title                     VARCHAR NOT NULL,
  description               TEXT,
  priority                  VARCHAR NOT NULL DEFAULT 'medium',
  status                    VARCHAR NOT NULL DEFAULT 'created',
  on_hold_reason            VARCHAR,
  assigned_type             VARCHAR NOT NULL DEFAULT 'internal',
  assigned_technician_id    INT REFERENCES employees(id) ON DELETE SET NULL,
  assigned_vendor_id        INT REFERENCES maintenance_vendors(id) ON DELETE SET NULL,
  scheduled_start           TIMESTAMPTZ,
  scheduled_end             TIMESTAMPTZ,
  actual_start              TIMESTAMPTZ,
  actual_end                TIMESTAMPTZ,
  completion_notes          TEXT,
  estimated_cost            DECIMAL(12,2),
  actual_cost               DECIMAL(12,2),
  labor_cost                DECIMAL(12,2),
  vendor_cost               DECIMAL(12,2),
  meter_reading_at_service  DECIMAL(12,2),
  is_partial                BOOLEAN NOT NULL DEFAULT FALSE,
  parent_work_order_id      INT REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
  bom_template_id           INT REFERENCES maintenance_bom_templates(id) ON DELETE SET NULL,
  closure_verified_by       INT REFERENCES employees(id) ON DELETE SET NULL,
  closure_verified_at       TIMESTAMPTZ,
  created_by                INT REFERENCES employees(id) ON DELETE SET NULL,
  created_date              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Work Order Parts
CREATE TABLE IF NOT EXISTS maintenance_work_order_parts (
  id                  SERIAL PRIMARY KEY,
  enterprise_id       INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  work_order_id       INT NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
  raw_material_id     INT NOT NULL REFERENCES raw_materials(id),
  source              VARCHAR NOT NULL DEFAULT 'bom_auto',
  quantity_required   DECIMAL(10,3) NOT NULL,
  quantity_reserved   DECIMAL(10,3) NOT NULL DEFAULT 0,
  quantity_consumed   DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit                VARCHAR,
  status              VARCHAR NOT NULL DEFAULT 'pending',
  notes               TEXT,
  created_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Work Order Status Logs
CREATE TABLE IF NOT EXISTS maintenance_work_order_status_logs (
  id             SERIAL PRIMARY KEY,
  work_order_id  INT NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
  from_status    VARCHAR,
  to_status      VARCHAR NOT NULL,
  changed_by     INT REFERENCES employees(id) ON DELETE SET NULL,
  reason         TEXT,
  created_date   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Downtime Logs
CREATE TABLE IF NOT EXISTS maintenance_downtime_logs (
  id                    SERIAL PRIMARY KEY,
  enterprise_id         INT NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  machine_id            INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  work_order_id         INT,
  downtime_start        TIMESTAMPTZ NOT NULL,
  downtime_end          TIMESTAMPTZ,
  duration_minutes      INT,
  reason_code           VARCHAR NOT NULL DEFAULT 'scheduled_maintenance',
  reason_detail         TEXT,
  impact                VARCHAR NOT NULL DEFAULT 'full_stop',
  production_loss_units INT,
  logged_by             INT REFERENCES employees(id) ON DELETE SET NULL,
  created_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_date         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_machines_enterprise ON machines(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_amc_contracts_end_date ON amc_contracts(enterprise_id, end_date, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_status ON maintenance_reminders(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_due ON maintenance_reminders(due_date, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_enterprise ON maintenance_work_orders(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON maintenance_work_orders(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_downtime_machine ON maintenance_downtime_logs(enterprise_id, machine_id);

SELECT 'Machinery maintenance migration completed successfully.' AS result;
