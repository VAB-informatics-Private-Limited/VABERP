-- Total clear of waste-management module data.
-- Runs as a single transaction. Uses CASCADE + RESTART IDENTITY so IDs reset.

BEGIN;

TRUNCATE TABLE
  "waste_inventory_log",
  "waste_inventory",
  "waste_disposal_lines",
  "waste_disposal_transactions",
  "waste_party_rates",
  "waste_parties",
  "waste_sources",
  "waste_categories"
RESTART IDENTITY CASCADE;

COMMIT;

-- Quick verification
SELECT 'waste_categories' AS tbl, COUNT(*) FROM waste_categories
UNION ALL SELECT 'waste_sources', COUNT(*) FROM waste_sources
UNION ALL SELECT 'waste_inventory', COUNT(*) FROM waste_inventory
UNION ALL SELECT 'waste_inventory_log', COUNT(*) FROM waste_inventory_log
UNION ALL SELECT 'waste_parties', COUNT(*) FROM waste_parties
UNION ALL SELECT 'waste_party_rates', COUNT(*) FROM waste_party_rates
UNION ALL SELECT 'waste_disposal_transactions', COUNT(*) FROM waste_disposal_transactions
UNION ALL SELECT 'waste_disposal_lines', COUNT(*) FROM waste_disposal_lines;
