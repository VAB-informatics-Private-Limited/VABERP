-- ============================================================
-- Organizer Module Migration
-- ============================================================

-- Core items table
CREATE TABLE organizer_items (
  id SERIAL PRIMARY KEY,
  enterprise_id INTEGER NOT NULL,
  item_number VARCHAR(20) NOT NULL UNIQUE,        -- ORG-2026-00001
  type VARCHAR(20) NOT NULL,                       -- task | reminder | follow_up | recurring
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(10) NOT NULL DEFAULT 'medium', -- low | medium | high | critical
  status VARCHAR(20) NOT NULL DEFAULT 'open',     -- open | in_progress | done | snoozed | cancelled
  assigned_to INTEGER[] DEFAULT '{}',
  created_by INTEGER NOT NULL,
  due_date TIMESTAMPTZ,
  remind_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurrence rules (only for type=recurring)
CREATE TABLE organizer_recurrence_rules (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES organizer_items(id) ON DELETE CASCADE,
  frequency VARCHAR(10) NOT NULL,    -- daily | weekly | monthly | custom
  interval_days INTEGER,              -- for custom: every N days
  days_of_week INTEGER[] DEFAULT '{}', -- 0=Sun..6=Sat for weekly
  day_of_month INTEGER,               -- for monthly
  end_date DATE,
  max_occurrences INTEGER,
  occurrences_generated INTEGER DEFAULT 0,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Polymorphic context links
CREATE TABLE organizer_context_links (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES organizer_items(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL,  -- enquiry | customer | machine | vendor | work_order
  entity_id INTEGER NOT NULL,
  label VARCHAR(200),                -- cached display label
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE organizer_activity_log (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES organizer_items(id) ON DELETE CASCADE,
  user_id INTEGER,
  action VARCHAR(50) NOT NULL,       -- created | status_changed | snoozed | completed | comment_added
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizer_items_enterprise ON organizer_items(enterprise_id);
CREATE INDEX idx_organizer_items_status ON organizer_items(status) WHERE status NOT IN ('done','cancelled');
CREATE INDEX idx_organizer_items_due ON organizer_items(due_date) WHERE status NOT IN ('done','cancelled');
CREATE INDEX idx_organizer_items_remind ON organizer_items(remind_at) WHERE remind_at IS NOT NULL AND status NOT IN ('done','cancelled');
CREATE INDEX idx_organizer_context_links_entity ON organizer_context_links(entity_type, entity_id);
CREATE INDEX idx_organizer_recurrence_next ON organizer_recurrence_rules(next_run_date);
