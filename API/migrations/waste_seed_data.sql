-- ─── Waste Management Seed Data ─────────────────────────────────────────────
-- Enterprise: VAB Test Enterprise (id = 1)

-- ─── 1. Waste Categories ─────────────────────────────────────────────────────

INSERT INTO waste_categories (enterprise_id, name, code, classification, unit, requires_manifest, max_storage_days, handling_notes, is_active) VALUES
(1, 'Metal Scrap (Ferrous)',   'MTL-FER', 'recyclable', 'kg',    false, 180, 'Store in designated scrap yard. Keep dry to prevent rust.', true),
(1, 'Metal Scrap (Non-Ferrous)','MTL-NFR','recyclable', 'kg',    false, 180, 'Separate aluminium, copper, brass before storage.', true),
(1, 'Coolant & Oil Waste',     'OIL-CLT', 'hazardous',  'litre', true,  90,  'DANGER: Store in sealed drums. Do not mix with water. Requires manifest for disposal.', true),
(1, 'Plastic Waste',           'PLT-WST', 'recyclable', 'kg',    false, 120, 'Segregate by type (HDPE, PET, PP). Compress before storage.', true),
(1, 'Chemical Waste',          'CHM-WST', 'hazardous',  'litre', true,  30,  'HAZARDOUS: Store in chemical-resistant containers. Keep away from heat sources.', true),
(1, 'E-Waste / Electrical',    'ELT-WST', 'e-waste',    'unit',  false, 365, 'Store in anti-static bags. Do not crush or puncture batteries.', true),
(1, 'Packaging Waste',         'PKG-WST', 'general',    'kg',    false, 60,  'Flatten cardboard and bundle. Store in dry area.', true),
(1, 'Organic / Food Waste',    'ORG-WST', 'organic',    'kg',    false, 7,   'PERISHABLE: Dispose within 7 days. Store in covered bins.', true),
(1, 'Rubber & Gaskets',        'RBR-WST', 'general',    'kg',    false, 90,  'Bundle and label by machine source.', true),
(1, 'Grinding Dust / Swarf',   'GRD-SWF', 'recyclable', 'kg',    false, 60,  'Collect in sealed containers. Keep away from water — fire risk.', true)
ON CONFLICT DO NOTHING;

-- ─── 2. Waste Sources ────────────────────────────────────────────────────────

INSERT INTO waste_sources (enterprise_id, name, source_type, reference_type, location, is_active) VALUES
(1, 'CNC Machining Department',     'department', 'department', 'Shop Floor - Bay A', true),
(1, 'Hydraulic Press Section',      'machine',    'machine',    'Shop Floor - Bay B', true),
(1, 'Assembly & Welding Line',      'process',    NULL,         'Shop Floor - Bay C', true),
(1, 'Maintenance Workshop',         'department', 'department', 'Maintenance Block',  true),
(1, 'Packaging & Dispatch',         'department', 'department', 'Dispatch Area',      true),
(1, 'Quality Control Lab',          'department', 'department', 'QC Lab - Building 2',true),
(1, 'Canteen & Facilities',         'external',   NULL,         'Admin Block',        true)
ON CONFLICT DO NOTHING;

-- ─── 3. Waste Parties (Vendors & Customers) ───────────────────────────────────

INSERT INTO waste_parties (enterprise_id, party_code, company_name, party_type, contact_person, phone, email, address, gst_number, pollution_board_cert, cert_expiry_date, handles_hazardous, payment_terms, status, rating, notes) VALUES
(1, 'WPT-001', 'GreenCycle Recyclers Pvt Ltd',    'customer', 'Rajesh Sharma',   '9876543210', 'rajesh@greencycle.in',    '12 Industrial Estate, Pune, MH 411019',  '27ABCDE1234F1Z5', NULL,       NULL,         false, 'net_30',    'active',     4.5, 'Primary scrap buyer. Picks up every 2 weeks. Good rates for ferrous metal.'),
(1, 'WPT-002', 'EcoHazard Solutions Ltd',         'vendor',   'Priya Mehta',     '9765432109', 'priya@ecohazard.in',      '45 MIDC Road, Nashik, MH 422010',        '27FGHIJ5678K2Z6', 'PCB-MH-2024-0892', '2026-03-31', true,  'immediate', 'active',     4.2, 'Certified hazardous waste handler. Handles coolant, chemicals, oil. Pickup by appointment.'),
(1, 'WPT-003', 'Bharat Scrap Traders',            'customer', 'Sunil Patil',     '9654321098', 'sunil@bharatscrap.com',   '7 Scrap Market, Chakan, Pune 410501',    '27KLMNO9012P3Z7', NULL,       NULL,         false, 'immediate', 'active',     3.8, 'Good for non-ferrous metals. Cash on pickup.'),
(1, 'WPT-004', 'CleanEarth Waste Management',     'both',     'Anil Deshmukh',   '9543210987', 'anil@cleanearth.in',      '88 Green Park, Aurangabad, MH 431001',   '27PQRST3456U4Z8', 'PCB-MH-2023-0445', '2025-11-30', true,  'net_30',    'active',     4.0, 'Full-service waste management. NOTE: Cert expires Nov 2025 — renewal pending.'),
(1, 'WPT-005', 'National E-Waste Recyclers',      'vendor',   'Kavita Joshi',    '9432109876', 'kavita@nationalewaste.in', 'Plot 22, Taloja MIDC, Navi Mumbai 410208','27UVWXY7890V5Z9', NULL,       NULL,         false, 'net_30',    'active',     4.3, 'Government authorized e-waste recycler. Provides destruction certificates.')
ON CONFLICT DO NOTHING;

-- ─── 4. Waste Party Rates ─────────────────────────────────────────────────────

-- Get category IDs dynamically using subqueries
INSERT INTO waste_party_rates (party_id, category_id, rate_type, rate, currency, effective_from) VALUES
-- GreenCycle Recyclers: buys ferrous metal at ₹28/kg, non-ferrous at ₹120/kg
((SELECT id FROM waste_parties WHERE party_code='WPT-001' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='MTL-FER' AND enterprise_id=1), 'buy_rate', 28.00, 'INR', '2026-01-01'),
((SELECT id FROM waste_parties WHERE party_code='WPT-001' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='MTL-NFR' AND enterprise_id=1), 'buy_rate', 120.00, 'INR', '2026-01-01'),
((SELECT id FROM waste_parties WHERE party_code='WPT-001' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='PLT-WST' AND enterprise_id=1), 'buy_rate', 12.00, 'INR', '2026-01-01'),
((SELECT id FROM waste_parties WHERE party_code='WPT-001' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='GRD-SWF' AND enterprise_id=1), 'buy_rate', 8.00,  'INR', '2026-01-01'),
-- EcoHazard: charges for hazardous disposal
((SELECT id FROM waste_parties WHERE party_code='WPT-002' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='OIL-CLT' AND enterprise_id=1), 'disposal_rate', 45.00, 'INR', '2026-01-01'),
((SELECT id FROM waste_parties WHERE party_code='WPT-002' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='CHM-WST' AND enterprise_id=1), 'disposal_rate', 85.00, 'INR', '2026-01-01'),
-- Bharat Scrap: buys ferrous only, slightly lower rate
((SELECT id FROM waste_parties WHERE party_code='WPT-003' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='MTL-FER' AND enterprise_id=1), 'buy_rate', 25.00, 'INR', '2026-01-01'),
((SELECT id FROM waste_parties WHERE party_code='WPT-003' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='MTL-NFR' AND enterprise_id=1), 'buy_rate', 105.00,'INR', '2026-01-01'),
-- CleanEarth: full service
((SELECT id FROM waste_parties WHERE party_code='WPT-004' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='OIL-CLT' AND enterprise_id=1), 'disposal_rate', 50.00, 'INR', '2026-01-01'),
((SELECT id FROM waste_parties WHERE party_code='WPT-004' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='PKG-WST' AND enterprise_id=1), 'buy_rate', 5.00, 'INR', '2026-01-01'),
((SELECT id FROM waste_parties WHERE party_code='WPT-004' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='RBR-WST' AND enterprise_id=1), 'buy_rate', 3.00, 'INR', '2026-01-01'),
-- National E-Waste: charges for e-waste processing
((SELECT id FROM waste_parties WHERE party_code='WPT-005' AND enterprise_id=1), (SELECT id FROM waste_categories WHERE code='ELT-WST' AND enterprise_id=1), 'disposal_rate', 120.00, 'INR', '2026-01-01')
ON CONFLICT DO NOTHING;

-- ─── 5. Waste Inventory Batches ──────────────────────────────────────────────

INSERT INTO waste_inventory (enterprise_id, batch_no, category_id, source_id, quantity_generated, quantity_available, quantity_reserved, unit, storage_location, storage_date, expiry_alert_date, status, hazard_level, estimated_value, notes) VALUES

-- Ferrous Metal Scrap batches (CNC dept)
(1, 'WST-2026-00001',
  (SELECT id FROM waste_categories WHERE code='MTL-FER' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='CNC Machining Department' AND enterprise_id=1),
  850.000, 850.000, 0, 'kg', 'Scrap Yard - Bay A, Section 1',
  '2026-03-01', NULL, 'available', NULL, 23800.00,
  'Monthly accumulation from CNC turning operations. Mix of mild steel and SS304 offcuts.'),

(1, 'WST-2026-00002',
  (SELECT id FROM waste_categories WHERE code='MTL-FER' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='Hydraulic Press Section' AND enterprise_id=1),
  420.000, 420.000, 0, 'kg', 'Scrap Yard - Bay B',
  '2026-03-15', NULL, 'available', NULL, 11760.00,
  'Punching and blanking offcuts from hydraulic press. Mostly mild steel sheets.'),

(1, 'WST-2026-00003',
  (SELECT id FROM waste_categories WHERE code='MTL-NFR' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='CNC Machining Department' AND enterprise_id=1),
  95.500, 95.500, 0, 'kg', 'Non-Ferrous Scrap Bin - Bay A',
  '2026-03-10', NULL, 'available', NULL, 11460.00,
  'Aluminium 6061 chips and brass shavings from precision machining. High value.'),

-- Coolant/Oil waste (hazardous)
(1, 'WST-2026-00004',
  (SELECT id FROM waste_categories WHERE code='OIL-CLT' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='CNC Machining Department' AND enterprise_id=1),
  320.000, 200.000, 0, 'litre', 'Hazardous Store - Drum H-03',
  '2026-02-20', '2026-05-21', 'partially_disposed', 'medium', NULL,
  'Used coolant from CNC machines. Drum H-03 (200L remaining). 120L disposed on Feb batch.'),

(1, 'WST-2026-00005',
  (SELECT id FROM waste_categories WHERE code='OIL-CLT' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='Hydraulic Press Section' AND enterprise_id=1),
  180.000, 180.000, 0, 'litre', 'Hazardous Store - Drum H-04',
  '2026-03-05', '2026-06-03', 'available', 'high', NULL,
  'Hydraulic oil from press system maintenance. HLP46 grade. Drum H-04 sealed.'),

-- Chemical waste (hazardous)
(1, 'WST-2026-00006',
  (SELECT id FROM waste_categories WHERE code='CHM-WST' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='Quality Control Lab' AND enterprise_id=1),
  45.000, 45.000, 0, 'litre', 'Hazardous Store - Cabinet C-01',
  '2026-03-12', '2026-04-11', 'available', 'high', NULL,
  'Expired chemical reagents from QC lab. Includes acetone, methanol, cleaning agents. URGENT: 30-day max storage.'),

-- Plastic waste
(1, 'WST-2026-00007',
  (SELECT id FROM waste_categories WHERE code='PLT-WST' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='Packaging & Dispatch' AND enterprise_id=1),
  230.000, 230.000, 0, 'kg', 'Waste Storage - Rack P-01',
  '2026-03-01', NULL, 'available', NULL, 2760.00,
  'HDPE packaging material, stretch film, bubble wrap from incoming goods. Sorted and compressed.'),

-- E-waste
(1, 'WST-2026-00008',
  (SELECT id FROM waste_categories WHERE code='ELT-WST' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='Maintenance Workshop' AND enterprise_id=1),
  42.000, 42.000, 0, 'unit', 'E-Waste Cage - Maintenance Block',
  '2026-02-01', NULL, 'available', 'low', NULL,
  'Old control panels, motors, cables, PCBs from machinery upgrades. Includes 3 VFDs, 12 PLCs, misc cables.'),

-- Packaging waste
(1, 'WST-2026-00009',
  (SELECT id FROM waste_categories WHERE code='PKG-WST' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='Packaging & Dispatch' AND enterprise_id=1),
  310.000, 310.000, 0, 'kg', 'Waste Storage - Rack P-02',
  '2026-03-20', NULL, 'available', NULL, 1550.00,
  'Cardboard boxes, paper, foam inserts from production line packaging.'),

-- Grinding swarf (fully disposed - historical)
(1, 'WST-2026-00010',
  (SELECT id FROM waste_categories WHERE code='GRD-SWF' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='CNC Machining Department' AND enterprise_id=1),
  175.000, 0.000, 0, 'kg', 'Scrap Yard - Bay A',
  '2026-02-01', NULL, 'fully_disposed', NULL, NULL,
  'Grinding swarf from Feb batch. Fully disposed to GreenCycle on Feb 28.'),

-- Rubber/gaskets
(1, 'WST-2026-00011',
  (SELECT id FROM waste_categories WHERE code='RBR-WST' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='Maintenance Workshop' AND enterprise_id=1),
  88.000, 88.000, 0, 'kg', 'Waste Storage - Shelf R-01',
  '2026-02-15', NULL, 'available', NULL, NULL,
  'Used rubber gaskets, O-rings, seals from hydraulic and pneumatic systems overhaul.'),

-- Organic waste (expired - old entry)
(1, 'WST-2026-00012',
  (SELECT id FROM waste_categories WHERE code='ORG-WST' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='Canteen & Facilities' AND enterprise_id=1),
  25.000, 25.000, 0, 'kg', 'Waste Bin - Canteen',
  '2026-03-06', '2026-03-13', 'expired', NULL, NULL,
  'Kitchen and canteen organic waste. Auto-expired — needs immediate disposal action.'),

-- Large ferrous batch currently reserved (pending disposal)
(1, 'WST-2026-00013',
  (SELECT id FROM waste_categories WHERE code='MTL-FER' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='Assembly & Welding Line' AND enterprise_id=1),
  560.000, 160.000, 400.000, 'kg', 'Scrap Yard - Bay C',
  '2026-03-08', NULL, 'partially_disposed', NULL, 15680.00,
  'Welding offcuts and assembly metal scraps. 400kg reserved for WDT-2026-00002.'),

-- Non-ferrous quarantined (contamination suspected)
(1, 'WST-2026-00014',
  (SELECT id FROM waste_categories WHERE code='MTL-NFR' AND enterprise_id=1),
  (SELECT id FROM waste_sources WHERE name='CNC Machining Department' AND enterprise_id=1),
  60.000, 60.000, 0, 'kg', 'Quarantine Area - QZ-01',
  '2026-03-18', NULL, 'quarantined', NULL, NULL,
  'HOLD: Suspected coolant contamination in non-ferrous batch. Awaiting QC clearance before disposal.')
ON CONFLICT (enterprise_id, batch_no) DO NOTHING;

-- ─── 6. Waste Inventory Logs ─────────────────────────────────────────────────

INSERT INTO waste_inventory_log (inventory_id, action, quantity_delta, quantity_after, reference_type, notes) VALUES
-- WST-00001 generated
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00001' AND enterprise_id=1), 'generated', 850.000, 850.000, NULL, 'Batch WST-2026-00001 created'),
-- WST-00004 generated then partially disposed
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00004' AND enterprise_id=1), 'generated', 320.000, 320.000, NULL, 'Batch WST-2026-00004 created'),
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00004' AND enterprise_id=1), 'reserved', -120.000, 200.000, 'disposal_transaction', 'Reserved for WDT-2026-00001'),
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00004' AND enterprise_id=1), 'disposed', -120.000, 200.000, 'disposal_transaction', 'Disposed 120L to EcoHazard Solutions'),
-- WST-00010 generated and fully disposed
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00010' AND enterprise_id=1), 'generated', 175.000, 175.000, NULL, 'Batch WST-2026-00010 created'),
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00010' AND enterprise_id=1), 'reserved', -175.000, 0.000, 'disposal_transaction', 'Reserved for WDT-2026-00001'),
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00010' AND enterprise_id=1), 'disposed', -175.000, 0.000, 'disposal_transaction', 'Fully disposed to GreenCycle Recyclers'),
-- WST-00013 reserved
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00013' AND enterprise_id=1), 'generated', 560.000, 560.000, NULL, 'Batch WST-2026-00013 created'),
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00013' AND enterprise_id=1), 'reserved', -400.000, 160.000, 'disposal_transaction', 'Reserved for WDT-2026-00002'),
-- WST-00014 quarantined
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00014' AND enterprise_id=1), 'generated', 60.000, 60.000, NULL, 'Batch WST-2026-00014 created'),
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00014' AND enterprise_id=1), 'quarantined', 0.000, 60.000, 'manual', 'Quarantined: suspected coolant contamination — QC hold'),
-- WST-00012 expired
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00012' AND enterprise_id=1), 'generated', 25.000, 25.000, NULL, 'Batch WST-2026-00012 created'),
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00012' AND enterprise_id=1), 'expired', 0.000, 25.000, 'manual', 'Auto-expired by system — max storage 7 days exceeded');

-- ─── 7. Waste Disposal Transactions ──────────────────────────────────────────

INSERT INTO waste_disposal_transactions (enterprise_id, transaction_no, party_id, transaction_type, disposal_method, status, scheduled_date, completed_date, total_quantity, total_revenue, total_cost, manifest_number, vehicle_number, driver_name, notes) VALUES

-- COMPLETED: Feb scrap + coolant run
(1, 'WDT-2026-00001',
  (SELECT id FROM waste_parties WHERE party_code='WPT-001' AND enterprise_id=1),
  'sale', 'recycling', 'completed',
  '2026-02-28', '2026-02-28',
  295.000, 5710.00, 0.00,
  NULL, 'MH-12-AB-4521', 'Ramesh Tiwari',
  'February scrap clearance. GreenCycle pickup. Weighed at gate.'),

-- COMPLETED: Hazardous coolant disposal - Feb
(1, 'WDT-2026-00002',
  (SELECT id FROM waste_parties WHERE party_code='WPT-002' AND enterprise_id=1),
  'disposal', 'incineration', 'completed',
  '2026-02-28', '2026-02-28',
  120.000, 0.00, 5400.00,
  'MNF-2026-0228-ECO', 'MH-09-CD-7812', 'Vijay Kale',
  'Hazardous coolant disposal. EcoHazard collected and incinerated. Manifest MNF-2026-0228-ECO issued.'),

-- CONFIRMED: March metal scrap sale (pending pickup)
(1, 'WDT-2026-00003',
  (SELECT id FROM waste_parties WHERE party_code='WPT-001' AND enterprise_id=1),
  'sale', 'recycling', 'confirmed',
  '2026-04-05', NULL,
  400.000, 11200.00, 0.00,
  NULL, NULL, NULL,
  'March batch — welding scrap from Bay C. GreenCycle to pickup April 5.'),

-- DRAFT: Upcoming hazardous disposal planned
(1, 'WDT-2026-00004',
  (SELECT id FROM waste_parties WHERE party_code='WPT-002' AND enterprise_id=1),
  'disposal', 'incineration', 'draft',
  '2026-04-15', NULL,
  0.000, 0.00, 0.00,
  NULL, NULL, NULL,
  'Planned disposal of current coolant + chemical waste. Awaiting manifest from EcoHazard.'),

-- COMPLETED: E-waste disposal (paid for processing)
(1, 'WDT-2026-00005',
  (SELECT id FROM waste_parties WHERE party_code='WPT-005' AND enterprise_id=1),
  'disposal', 'recycling', 'completed',
  '2026-03-10', '2026-03-10',
  18.000, 0.00, 2160.00,
  NULL, 'MH-04-EF-9034', 'Santosh More',
  'E-waste batch - old PCBs and motors. National E-Waste collected. Destruction certificate received.')
ON CONFLICT (enterprise_id, transaction_no) DO NOTHING;

-- ─── 8. Waste Disposal Lines ─────────────────────────────────────────────────

INSERT INTO waste_disposal_lines (transaction_id, inventory_id, category_id, quantity_requested, quantity_actual, unit, rate, revenue, cost) VALUES

-- WDT-00001 lines (completed Feb scrap sale)
(
  (SELECT id FROM waste_disposal_transactions WHERE transaction_no='WDT-2026-00001' AND enterprise_id=1),
  (SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00010' AND enterprise_id=1),
  (SELECT id FROM waste_categories WHERE code='GRD-SWF' AND enterprise_id=1),
  175.000, 175.000, 'kg', 8.00, 1400.00, 0.00
),
-- A historical ferrous batch (WST-00001 partial - pretend 120kg was taken in Feb but keep main batch available)
-- Actually let's reference a separate disposed batch entry - use WST-00010 for the swarf, and we'll note WST-00001 was untouched in Feb

-- WDT-00002 lines (completed Feb coolant disposal)
(
  (SELECT id FROM waste_disposal_transactions WHERE transaction_no='WDT-2026-00002' AND enterprise_id=1),
  (SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00004' AND enterprise_id=1),
  (SELECT id FROM waste_categories WHERE code='OIL-CLT' AND enterprise_id=1),
  120.000, 120.000, 'litre', 45.00, 0.00, 5400.00
),

-- WDT-00003 lines (confirmed March scrap - reserved, not completed yet)
(
  (SELECT id FROM waste_disposal_transactions WHERE transaction_no='WDT-2026-00003' AND enterprise_id=1),
  (SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00013' AND enterprise_id=1),
  (SELECT id FROM waste_categories WHERE code='MTL-FER' AND enterprise_id=1),
  400.000, NULL, 'kg', 28.00, 0.00, 0.00
),

-- WDT-00005 lines (completed e-waste)
(
  (SELECT id FROM waste_disposal_transactions WHERE transaction_no='WDT-2026-00005' AND enterprise_id=1),
  (SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00008' AND enterprise_id=1),
  (SELECT id FROM waste_categories WHERE code='ELT-WST' AND enterprise_id=1),
  18.000, 18.000, 'unit', 120.00, 0.00, 2160.00
);

-- Update e-waste inventory to reflect partial disposal
UPDATE waste_inventory
SET quantity_available = 24.000,
    status = 'partially_disposed'
WHERE batch_no = 'WST-2026-00008' AND enterprise_id = 1;

INSERT INTO waste_inventory_log (inventory_id, action, quantity_delta, quantity_after, reference_type, notes) VALUES
((SELECT id FROM waste_inventory WHERE batch_no='WST-2026-00008' AND enterprise_id=1),
 'disposed', -18.000, 24.000, 'disposal_transaction',
 'Disposed 18 units to National E-Waste Recyclers on WDT-2026-00005');

-- ─── Verification Query ───────────────────────────────────────────────────────
SELECT 'waste_categories' AS tbl, COUNT(*) FROM waste_categories WHERE enterprise_id=1
UNION ALL SELECT 'waste_sources', COUNT(*) FROM waste_sources WHERE enterprise_id=1
UNION ALL SELECT 'waste_inventory', COUNT(*) FROM waste_inventory WHERE enterprise_id=1
UNION ALL SELECT 'waste_parties', COUNT(*) FROM waste_parties WHERE enterprise_id=1
UNION ALL SELECT 'waste_party_rates', COUNT(*) FROM waste_party_rates WHERE party_id IN (SELECT id FROM waste_parties WHERE enterprise_id=1)
UNION ALL SELECT 'waste_disposal_transactions', COUNT(*) FROM waste_disposal_transactions WHERE enterprise_id=1
UNION ALL SELECT 'waste_disposal_lines', COUNT(*) FROM waste_disposal_lines WHERE transaction_id IN (SELECT id FROM waste_disposal_transactions WHERE enterprise_id=1)
UNION ALL SELECT 'waste_inventory_log', COUNT(*) FROM waste_inventory_log WHERE inventory_id IN (SELECT id FROM waste_inventory WHERE enterprise_id=1);
