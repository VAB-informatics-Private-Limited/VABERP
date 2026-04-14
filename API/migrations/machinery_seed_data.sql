-- ============================================================
-- Machinery Maintenance Module - Seed / Demo Data
-- Enterprise ID: 1 (VAB Test Enterprise)
-- ============================================================

-- ─── Machine Categories ──────────────────────────────────────
INSERT INTO machine_categories (enterprise_id, name, description, color) VALUES
  (1, 'CNC Machines',       'Computer numerical control machining centres',  '#1677ff'),
  (1, 'Hydraulic Systems',  'Hydraulic press, bending and forming machines', '#fa8c16'),
  (1, 'Electrical Panels',  'Power distribution and control panels',          '#52c41a'),
  (1, 'Compressors',        'Air compressors and pneumatic equipment',        '#722ed1'),
  (1, 'Conveyors',          'Material handling and conveyor belt systems',    '#eb2f96')
ON CONFLICT DO NOTHING;

-- ─── Machines ────────────────────────────────────────────────
INSERT INTO machines (enterprise_id, machine_code, name, category_id, make, model, serial_number,
  year_of_manufacture, purchase_date, purchase_cost, location, department, status, criticality,
  meter_unit, current_meter_reading, notes)
SELECT
  1, 'MC-001', 'CNC Machining Centre Alpha',
  (SELECT id FROM machine_categories WHERE enterprise_id=1 AND name='CNC Machines'),
  'Fanuc', 'Robodrill α-D21MiB5', 'FNC-2019-00341',
  2019, '2019-06-15', 2850000, 'Shop Floor A', 'Production',
  'active', 'critical', 'hours', 4821.5,
  'Primary CNC for precision part machining. 5-axis capability.'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE enterprise_id=1 AND machine_code='MC-001');

INSERT INTO machines (enterprise_id, machine_code, name, category_id, make, model, serial_number,
  year_of_manufacture, purchase_date, purchase_cost, location, department, status, criticality,
  meter_unit, current_meter_reading, notes)
SELECT
  1, 'MC-002', 'CNC Turning Centre Beta',
  (SELECT id FROM machine_categories WHERE enterprise_id=1 AND name='CNC Machines'),
  'Haas', 'ST-20Y', 'HAS-2021-88012',
  2021, '2021-03-10', 1950000, 'Shop Floor A', 'Production',
  'active', 'high', 'hours', 2310.0,
  'Turning centre with Y-axis live tooling for complex components.'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE enterprise_id=1 AND machine_code='MC-002');

INSERT INTO machines (enterprise_id, machine_code, name, category_id, make, model, serial_number,
  year_of_manufacture, purchase_date, purchase_cost, location, department, status, criticality,
  meter_unit, current_meter_reading, notes)
SELECT
  1, 'HY-001', '100T Hydraulic Press',
  (SELECT id FROM machine_categories WHERE enterprise_id=1 AND name='Hydraulic Systems'),
  'Ajax', 'HPS-100', 'AJX-2018-5521',
  2018, '2018-11-20', 1200000, 'Press Shop', 'Production',
  'under_maintenance', 'high', 'cycles', 125000,
  'Heavy duty forming press. Currently under scheduled oil seal replacement.'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE enterprise_id=1 AND machine_code='HY-001');

INSERT INTO machines (enterprise_id, machine_code, name, category_id, make, model, serial_number,
  year_of_manufacture, purchase_date, purchase_cost, location, department, status, criticality,
  meter_unit, current_meter_reading, notes)
SELECT
  1, 'CP-001', 'Air Compressor Unit 1',
  (SELECT id FROM machine_categories WHERE enterprise_id=1 AND name='Compressors'),
  'Atlas Copco', 'GA 37+', 'ATC-2020-00987',
  2020, '2020-08-05', 425000, 'Utility Room', 'Maintenance',
  'active', 'medium', 'hours', 8740,
  'Primary air supply for pneumatic tools and assembly line.'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE enterprise_id=1 AND machine_code='CP-001');

INSERT INTO machines (enterprise_id, machine_code, name, category_id, make, model, serial_number,
  year_of_manufacture, purchase_date, purchase_cost, location, department, status, criticality,
  meter_unit, current_meter_reading, notes)
SELECT
  1, 'CV-001', 'Assembly Conveyor Line 1',
  (SELECT id FROM machine_categories WHERE enterprise_id=1 AND name='Conveyors'),
  'Hytrol', 'Model 190-ACC', 'HYT-2017-4490',
  2017, '2017-04-12', 380000, 'Assembly Area', 'Production',
  'active', 'medium', 'hours', 19500,
  '40 metre belt conveyor for final assembly. Drive motor 5.5kW.'
WHERE NOT EXISTS (SELECT 1 FROM machines WHERE enterprise_id=1 AND machine_code='CV-001');

-- ─── Meter Logs ───────────────────────────────────────────────
INSERT INTO machine_meter_logs (machine_id, enterprise_id, reading_value, reading_date, source, notes)
SELECT m.id, 1, 4750.0, '2026-03-01', 'manual', 'Monthly reading - March'
FROM machines m WHERE m.enterprise_id=1 AND m.machine_code='MC-001'
AND NOT EXISTS (SELECT 1 FROM machine_meter_logs ml WHERE ml.machine_id=m.id AND ml.reading_date='2026-03-01');

INSERT INTO machine_meter_logs (machine_id, enterprise_id, reading_value, reading_date, source, notes)
SELECT m.id, 1, 4821.5, '2026-04-01', 'manual', 'Monthly reading - April'
FROM machines m WHERE m.enterprise_id=1 AND m.machine_code='MC-001'
AND NOT EXISTS (SELECT 1 FROM machine_meter_logs ml WHERE ml.machine_id=m.id AND ml.reading_date='2026-04-01');

INSERT INTO machine_meter_logs (machine_id, enterprise_id, reading_value, reading_date, source, notes)
SELECT m.id, 1, 8680.0, '2026-03-15', 'manual', 'Quarterly check'
FROM machines m WHERE m.enterprise_id=1 AND m.machine_code='CP-001'
AND NOT EXISTS (SELECT 1 FROM machine_meter_logs ml WHERE ml.machine_id=m.id AND ml.reading_date='2026-03-15');

-- ─── Maintenance Vendors ──────────────────────────────────────
INSERT INTO maintenance_vendors (enterprise_id, company_name, contact_person, phone, email, address,
  service_categories, status, notes)
VALUES
  (1, 'Fanuc India Pvt Ltd', 'Rajesh Kumar', '9876543210', 'service@fanuc.in',
   '14 Industrial Estate, Pune 411057',
   '["CNC Repair", "Servo Systems", "Spindle Overhaul"]', 'active',
   'Authorised Fanuc service partner. 24hr emergency response.'),
  (1, 'Atlas Copco Services', 'Suresh Nair', '9845001122', 'service.pune@atlascopco.com',
   '7 MIDC Bhosari, Pune 411026',
   '["Compressor Maintenance", "Air Systems", "Pneumatics"]', 'active',
   'OEM service for all Atlas Copco compressors.'),
  (1, 'Electro Maintenance Solutions', 'Priya Sharma', '9011223344', 'ems@gmail.com',
   '22 Phase 2, Pimpri Industrial Area',
   '["Electrical", "PLC", "Control Panels", "Wiring"]', 'active',
   'Handles all electrical and PLC-related service work.'),
  (1, 'QuickFix Hydraulics', 'Mohan Das', '9922334455', 'quickfix.hyd@yahoo.com',
   'Plot 8, Sanaswadi, Pune',
   '["Hydraulic Repair", "Oil Seals", "Cylinder Reconditioning"]', 'active',
   'Specialist in hydraulic system repairs and rebuilds.')
ON CONFLICT DO NOTHING;

-- ─── AMC Contracts ───────────────────────────────────────────
INSERT INTO amc_contracts (enterprise_id, vendor_id, machine_id, contract_number,
  start_date, end_date, contract_value, coverage_type, visit_frequency, status, notes)
SELECT 1,
  (SELECT id FROM maintenance_vendors WHERE enterprise_id=1 AND company_name='Fanuc India Pvt Ltd'),
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='MC-001'),
  'AMC-FANUC-2025-001',
  '2025-04-01', '2026-03-31', 185000,
  'comprehensive', 4, 'active',
  'Includes quarterly PM visits, emergency breakdown within 24hrs, all parts at 15% discount.'
WHERE NOT EXISTS (SELECT 1 FROM amc_contracts WHERE enterprise_id=1 AND contract_number='AMC-FANUC-2025-001');

INSERT INTO amc_contracts (enterprise_id, vendor_id, machine_id, contract_number,
  start_date, end_date, contract_value, coverage_type, visit_frequency, status, notes)
SELECT 1,
  (SELECT id FROM maintenance_vendors WHERE enterprise_id=1 AND company_name='Atlas Copco Services'),
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CP-001'),
  'AMC-ATC-2025-004',
  '2025-07-01', '2026-06-30', 52000,
  'comprehensive', 4, 'active',
  'Quarterly service visits. Includes oil, filter and separator element replacement.'
WHERE NOT EXISTS (SELECT 1 FROM amc_contracts WHERE enterprise_id=1 AND contract_number='AMC-ATC-2025-004');

-- ─── BOM Templates ───────────────────────────────────────────
-- BOM for CNC Quarterly PM
INSERT INTO maintenance_bom_templates (enterprise_id, name, machine_id, service_type, version, is_active, notes)
SELECT 1, 'CNC Quarterly PM Kit',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='MC-001'),
  'preventive', 1, true,
  'Standard parts for CNC machining centre quarterly preventive maintenance'
WHERE NOT EXISTS (SELECT 1 FROM maintenance_bom_templates WHERE enterprise_id=1 AND name='CNC Quarterly PM Kit');

-- BOM for Compressor 2000hr Service
INSERT INTO maintenance_bom_templates (enterprise_id, name, machine_id, service_type, version, is_active, notes)
SELECT 1, 'Compressor 2000hr Service Kit',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CP-001'),
  'preventive', 1, true,
  'Atlas Copco GA 37+ recommended 2000hr service parts'
WHERE NOT EXISTS (SELECT 1 FROM maintenance_bom_templates WHERE enterprise_id=1 AND name='Compressor 2000hr Service Kit');

-- BOM Lines for CNC PM
INSERT INTO maintenance_bom_lines (template_id, raw_material_id, quantity_required, unit, is_mandatory, notes, sort_order)
SELECT
  (SELECT id FROM maintenance_bom_templates WHERE enterprise_id=1 AND name='CNC Quarterly PM Kit'),
  id, 2.0, 'Litres', true, 'Spindle coolant top-up', 1
FROM raw_materials WHERE enterprise_id=1 AND material_name='MS Sheet 3mm'
AND NOT EXISTS (
  SELECT 1 FROM maintenance_bom_lines bl
  JOIN maintenance_bom_templates bt ON bl.template_id=bt.id
  WHERE bt.name='CNC Quarterly PM Kit' AND bl.sort_order=1
);

INSERT INTO maintenance_bom_lines (template_id, raw_material_id, quantity_required, unit, is_mandatory, notes, sort_order)
SELECT
  (SELECT id FROM maintenance_bom_templates WHERE enterprise_id=1 AND name='CNC Quarterly PM Kit'),
  id, 1.0, 'Pack', true, 'Lubrication grease pack', 2
FROM raw_materials WHERE enterprise_id=1 AND material_name='M8 Nut & Washer Set'
AND NOT EXISTS (
  SELECT 1 FROM maintenance_bom_lines bl
  JOIN maintenance_bom_templates bt ON bl.template_id=bt.id
  WHERE bt.name='CNC Quarterly PM Kit' AND bl.sort_order=2
);

INSERT INTO maintenance_bom_lines (template_id, raw_material_id, quantity_required, unit, is_mandatory, notes, sort_order)
SELECT
  (SELECT id FROM maintenance_bom_templates WHERE enterprise_id=1 AND name='CNC Quarterly PM Kit'),
  id, 1.0, 'Set', false, 'Air filter element (if needed)', 3
FROM raw_materials WHERE enterprise_id=1 AND material_name='Epoxy Primer 1L'
AND NOT EXISTS (
  SELECT 1 FROM maintenance_bom_lines bl
  JOIN maintenance_bom_templates bt ON bl.template_id=bt.id
  WHERE bt.name='CNC Quarterly PM Kit' AND bl.sort_order=3
);

-- ─── Reminder Rules ───────────────────────────────────────────
INSERT INTO maintenance_reminder_rules (enterprise_id, name, machine_id, trigger_type,
  interval_days, advance_notice_days, priority, is_recurring, bom_template_id,
  preferred_vendor_id, overdue_notify_after_days, status)
SELECT 1, 'CNC Alpha - Quarterly PM',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='MC-001'),
  'time_based', 90, 7, 'high', true,
  (SELECT id FROM maintenance_bom_templates WHERE enterprise_id=1 AND name='CNC Quarterly PM Kit'),
  (SELECT id FROM maintenance_vendors WHERE enterprise_id=1 AND company_name='Fanuc India Pvt Ltd'),
  1, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_reminder_rules
  WHERE enterprise_id=1 AND name='CNC Alpha - Quarterly PM'
);

INSERT INTO maintenance_reminder_rules (enterprise_id, name, machine_id, trigger_type,
  interval_days, advance_notice_days, priority, is_recurring, status)
SELECT 1, 'Hydraulic Press - Oil Seal Check',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='HY-001'),
  'time_based', 180, 14, 'critical', true, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_reminder_rules
  WHERE enterprise_id=1 AND name='Hydraulic Press - Oil Seal Check'
);

INSERT INTO maintenance_reminder_rules (enterprise_id, name, machine_id, trigger_type,
  interval_days, advance_notice_days, priority, is_recurring,
  bom_template_id, preferred_vendor_id, overdue_notify_after_days, status)
SELECT 1, 'Compressor - 2000hr Service',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CP-001'),
  'usage_based', NULL, 5, 'medium', true,
  (SELECT id FROM maintenance_bom_templates WHERE enterprise_id=1 AND name='Compressor 2000hr Service Kit'),
  (SELECT id FROM maintenance_vendors WHERE enterprise_id=1 AND company_name='Atlas Copco Services'),
  2, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_reminder_rules
  WHERE enterprise_id=1 AND name='Compressor - 2000hr Service'
);

INSERT INTO maintenance_reminder_rules (enterprise_id, name, machine_id, trigger_type,
  interval_days, advance_notice_days, priority, is_recurring, status)
SELECT 1, 'Conveyor Belt - Monthly Inspection',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CV-001'),
  'time_based', 30, 3, 'low', true, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_reminder_rules
  WHERE enterprise_id=1 AND name='Conveyor Belt - Monthly Inspection'
);

-- ─── Maintenance Reminders (instances) ───────────────────────
-- Overdue reminder for CNC
INSERT INTO maintenance_reminders (enterprise_id, rule_id, machine_id, due_date, trigger_type, status, snooze_count)
SELECT 1,
  (SELECT id FROM maintenance_reminder_rules WHERE enterprise_id=1 AND name='CNC Alpha - Quarterly PM'),
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='MC-001'),
  '2026-03-20', 'time_based', 'overdue', 0
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_reminders mr
  JOIN maintenance_reminder_rules rr ON mr.rule_id=rr.id
  WHERE rr.enterprise_id=1 AND rr.name='CNC Alpha - Quarterly PM' AND mr.due_date='2026-03-20'
);

-- Upcoming reminder for Hydraulic Press
INSERT INTO maintenance_reminders (enterprise_id, rule_id, machine_id, due_date, trigger_type, status, snooze_count)
SELECT 1,
  (SELECT id FROM maintenance_reminder_rules WHERE enterprise_id=1 AND name='Hydraulic Press - Oil Seal Check'),
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='HY-001'),
  '2026-05-01', 'time_based', 'pending', 0
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_reminders mr
  JOIN maintenance_reminder_rules rr ON mr.rule_id=rr.id
  WHERE rr.enterprise_id=1 AND rr.name='Hydraulic Press - Oil Seal Check' AND mr.due_date='2026-05-01'
);

-- Upcoming reminder for Conveyor (near due)
INSERT INTO maintenance_reminders (enterprise_id, rule_id, machine_id, due_date, trigger_type, status, snooze_count)
SELECT 1,
  (SELECT id FROM maintenance_reminder_rules WHERE enterprise_id=1 AND name='Conveyor Belt - Monthly Inspection'),
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CV-001'),
  '2026-04-18', 'time_based', 'pending', 0
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_reminders mr
  JOIN maintenance_reminder_rules rr ON mr.rule_id=rr.id
  WHERE rr.enterprise_id=1 AND rr.name='Conveyor Belt - Monthly Inspection' AND mr.due_date='2026-04-18'
);

-- ─── Work Orders ──────────────────────────────────────────────
-- WO-1: Completed PM on CNC
INSERT INTO maintenance_work_orders (enterprise_id, work_order_no, machine_id, reminder_id,
  service_type, title, description, priority, status, assigned_type,
  scheduled_start, scheduled_end, actual_start, actual_end,
  estimated_cost, actual_cost, labor_cost, completion_notes)
SELECT 1, 'WO-00001',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='MC-001'),
  NULL, 'preventive', 'CNC Alpha - Q1 2026 Preventive Maintenance',
  'Quarterly PM including spindle lubrication, coolant top-up, air filter check, way lube verification, and full accuracy check.',
  'high', 'completed', 'internal',
  '2026-01-15 09:00', '2026-01-15 17:00',
  '2026-01-15 09:30', '2026-01-15 16:45',
  12000, 9800, 4500,
  'PM completed. Spindle bearing showing slight play - noted for next service. Coolant replaced. All axes checked and within spec.'
WHERE NOT EXISTS (SELECT 1 FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001');

-- WO-2: In Progress - Hydraulic Press Oil Seal
INSERT INTO maintenance_work_orders (enterprise_id, work_order_no, machine_id,
  service_type, title, description, priority, status, assigned_type,
  assigned_vendor_id, scheduled_start, scheduled_end, actual_start,
  estimated_cost, on_hold_reason)
SELECT 1, 'WO-00002',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='HY-001'),
  'corrective', 'Hydraulic Press - Oil Seal Replacement (Main Cylinder)',
  'Main cylinder oil seal leaking. Requires full strip-down, seal kit replacement and hydraulic oil flush. Machine taken offline.',
  'critical', 'in_progress', 'vendor',
  (SELECT id FROM maintenance_vendors WHERE enterprise_id=1 AND company_name='QuickFix Hydraulics'),
  '2026-04-12 08:00', '2026-04-14 17:00',
  '2026-04-12 10:00',
  35000, NULL
WHERE NOT EXISTS (SELECT 1 FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00002');

-- WO-3: Open - Compressor 2000hr Service
INSERT INTO maintenance_work_orders (enterprise_id, work_order_no, machine_id,
  service_type, title, description, priority, status, assigned_type,
  assigned_vendor_id, scheduled_start, scheduled_end,
  bom_template_id, estimated_cost)
SELECT 1, 'WO-00003',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CP-001'),
  'preventive', 'Compressor CP-001 - 2000hr Scheduled Service',
  'Routine 2000hr service: replace air filter, oil filter, oil separator, drain condensate, check belt tension and safety valves.',
  'medium', 'created', 'vendor',
  (SELECT id FROM maintenance_vendors WHERE enterprise_id=1 AND company_name='Atlas Copco Services'),
  '2026-04-25 09:00', '2026-04-25 13:00',
  (SELECT id FROM maintenance_bom_templates WHERE enterprise_id=1 AND name='Compressor 2000hr Service Kit'),
  18500
WHERE NOT EXISTS (SELECT 1 FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00003');

-- WO-4: Completed - Conveyor drive motor replacement
INSERT INTO maintenance_work_orders (enterprise_id, work_order_no, machine_id,
  service_type, title, description, priority, status, assigned_type,
  scheduled_start, scheduled_end, actual_start, actual_end,
  estimated_cost, actual_cost, labor_cost, vendor_cost,
  completion_notes, closure_verified_at)
SELECT 1, 'WO-00004',
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CV-001'),
  'corrective', 'Conveyor CV-001 - Drive Motor Bearing Replacement',
  'Bearing in 5.5kW drive motor showing abnormal noise. Replaced both DE and NDE bearings.',
  'high', 'closed', 'internal',
  '2026-02-20 08:00', '2026-02-20 12:00',
  '2026-02-20 08:15', '2026-02-20 11:30',
  8500, 7200, 3500, 0,
  'DE & NDE bearings replaced. Motor test run 30 min - no vibration, no noise. Conveyor back online.',
  '2026-02-20 14:00'
WHERE NOT EXISTS (SELECT 1 FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00004');

-- ─── Work Order Parts ────────────────────────────────────────
-- Parts for WO-00001 (CNC PM - completed)
INSERT INTO maintenance_work_order_parts (enterprise_id, work_order_id, raw_material_id,
  source, quantity_required, quantity_reserved, quantity_consumed, unit, status)
SELECT 1,
  (SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001'),
  (SELECT id FROM raw_materials WHERE enterprise_id=1 AND material_name='MS Sheet 3mm'),
  'bom_auto', 2.0, 2.0, 2.0, 'Litres', 'consumed'
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_work_order_parts wp
  WHERE wp.work_order_id=(SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001')
  AND wp.raw_material_id=(SELECT id FROM raw_materials WHERE enterprise_id=1 AND material_name='MS Sheet 3mm')
);

-- Parts for WO-00003 (Compressor service - pending reserve)
INSERT INTO maintenance_work_order_parts (enterprise_id, work_order_id, raw_material_id,
  source, quantity_required, quantity_reserved, quantity_consumed, unit, status)
SELECT 1,
  (SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00003'),
  (SELECT id FROM raw_materials WHERE enterprise_id=1 AND material_name='Epoxy Primer 1L'),
  'bom_auto', 1.0, 0, 0, 'Pcs', 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_work_order_parts wp
  WHERE wp.work_order_id=(SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00003')
  AND wp.raw_material_id=(SELECT id FROM raw_materials WHERE enterprise_id=1 AND material_name='Epoxy Primer 1L')
);

INSERT INTO maintenance_work_order_parts (enterprise_id, work_order_id, raw_material_id,
  source, quantity_required, quantity_reserved, quantity_consumed, unit, status)
SELECT 1,
  (SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00003'),
  (SELECT id FROM raw_materials WHERE enterprise_id=1 AND material_name='M8 Nut & Washer Set'),
  'bom_auto', 4.0, 0, 0, 'Litres', 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_work_order_parts wp
  WHERE wp.work_order_id=(SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00003')
  AND wp.raw_material_id=(SELECT id FROM raw_materials WHERE enterprise_id=1 AND material_name='M8 Nut & Washer Set')
);

-- ─── Work Order Status Logs ───────────────────────────────────
INSERT INTO maintenance_work_order_status_logs (work_order_id, from_status, to_status, created_date)
SELECT id, NULL, 'created', '2026-01-10 11:00'
FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001'
AND NOT EXISTS (
  SELECT 1 FROM maintenance_work_order_status_logs sl
  WHERE sl.work_order_id=(SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001')
  AND sl.to_status='created'
);

INSERT INTO maintenance_work_order_status_logs (work_order_id, from_status, to_status, created_date)
SELECT id, 'created', 'in_progress', '2026-01-15 09:30'
FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001'
AND NOT EXISTS (
  SELECT 1 FROM maintenance_work_order_status_logs sl
  WHERE sl.work_order_id=(SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001')
  AND sl.to_status='in_progress'
);

INSERT INTO maintenance_work_order_status_logs (work_order_id, from_status, to_status, created_date)
SELECT id, 'in_progress', 'completed', '2026-01-15 16:45'
FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001'
AND NOT EXISTS (
  SELECT 1 FROM maintenance_work_order_status_logs sl
  WHERE sl.work_order_id=(SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001')
  AND sl.to_status='completed'
);

INSERT INTO maintenance_work_order_status_logs (work_order_id, from_status, to_status, created_date)
SELECT id, NULL, 'created', '2026-04-11 15:00'
FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00002'
AND NOT EXISTS (
  SELECT 1 FROM maintenance_work_order_status_logs sl
  WHERE sl.work_order_id=(SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00002')
  AND sl.to_status='created'
);

INSERT INTO maintenance_work_order_status_logs (work_order_id, from_status, to_status, created_date)
SELECT id, 'created', 'in_progress', '2026-04-12 10:00'
FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00002'
AND NOT EXISTS (
  SELECT 1 FROM maintenance_work_order_status_logs sl
  WHERE sl.work_order_id=(SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00002')
  AND sl.to_status='in_progress'
);

-- ─── Downtime Logs ────────────────────────────────────────────
INSERT INTO maintenance_downtime_logs (enterprise_id, machine_id, work_order_id,
  downtime_start, downtime_end, duration_minutes,
  reason_code, reason_detail, impact, production_loss_units)
SELECT 1,
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='MC-001'),
  (SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001'),
  '2026-01-15 08:00', '2026-01-15 17:00', 540,
  'scheduled_maintenance', 'Quarterly preventive maintenance window - planned shutdown.',
  'full_stop', 18
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_downtime_logs
  WHERE enterprise_id=1 AND machine_id=(SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='MC-001')
  AND downtime_start='2026-01-15 08:00'
);

INSERT INTO maintenance_downtime_logs (enterprise_id, machine_id, work_order_id,
  downtime_start, downtime_end, duration_minutes,
  reason_code, reason_detail, impact, production_loss_units)
SELECT 1,
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='HY-001'),
  (SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00002'),
  '2026-04-12 08:00', NULL, NULL,
  'breakdown', 'Main cylinder oil seal failure. Hydraulic fluid leaking. Machine unsafe to operate.',
  'full_stop', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_downtime_logs
  WHERE enterprise_id=1 AND machine_id=(SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='HY-001')
  AND downtime_start='2026-04-12 08:00'
);

INSERT INTO maintenance_downtime_logs (enterprise_id, machine_id, work_order_id,
  downtime_start, downtime_end, duration_minutes,
  reason_code, reason_detail, impact, production_loss_units)
SELECT 1,
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CV-001'),
  (SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00004'),
  '2026-02-20 06:00', '2026-02-20 12:00', 360,
  'breakdown', 'Drive motor bearing failure. Unusual grinding noise detected during start-up.',
  'full_stop', 0
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_downtime_logs
  WHERE enterprise_id=1 AND machine_id=(SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CV-001')
  AND downtime_start='2026-02-20 06:00'
);

INSERT INTO maintenance_downtime_logs (enterprise_id, machine_id,
  downtime_start, downtime_end, duration_minutes,
  reason_code, reason_detail, impact)
SELECT 1,
  (SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CP-001'),
  '2026-03-08 14:30', '2026-03-08 16:00', 90,
  'other', 'Brief shutdown for condensate drain system cleaning.',
  'no_impact'
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_downtime_logs
  WHERE enterprise_id=1 AND machine_id=(SELECT id FROM machines WHERE enterprise_id=1 AND machine_code='CP-001')
  AND downtime_start='2026-03-08 14:30'
);

-- ─── Vendor Performance Logs ──────────────────────────────────
INSERT INTO vendor_performance_logs (enterprise_id, vendor_id, work_order_id,
  quality_score, timeliness_score, communication_score, delay_days, feedback)
SELECT 1,
  (SELECT id FROM maintenance_vendors WHERE enterprise_id=1 AND company_name='Fanuc India Pvt Ltd'),
  (SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001'),
  4.5, 5.0, 4.0, 0,
  'Excellent PM service. Technician arrived on time, work completed efficiently. Detailed report provided.'
WHERE NOT EXISTS (
  SELECT 1 FROM vendor_performance_logs
  WHERE enterprise_id=1
  AND vendor_id=(SELECT id FROM maintenance_vendors WHERE enterprise_id=1 AND company_name='Fanuc India Pvt Ltd')
  AND work_order_id=(SELECT id FROM maintenance_work_orders WHERE enterprise_id=1 AND work_order_no='WO-00001')
);

-- Update vendor ratings
UPDATE maintenance_vendors SET rating = 4.5 WHERE enterprise_id=1 AND company_name='Fanuc India Pvt Ltd';
UPDATE maintenance_vendors SET rating = 4.2 WHERE enterprise_id=1 AND company_name='Atlas Copco Services';
UPDATE maintenance_vendors SET rating = 3.8 WHERE enterprise_id=1 AND company_name='QuickFix Hydraulics';
UPDATE maintenance_vendors SET rating = 4.0 WHERE enterprise_id=1 AND company_name='Electro Maintenance Solutions';

SELECT 'Machinery seed data inserted successfully.' AS result;
SELECT 'Machines: ' || COUNT(*)::text FROM machines WHERE enterprise_id=1;
SELECT 'Vendors: ' || COUNT(*)::text FROM maintenance_vendors WHERE enterprise_id=1;
SELECT 'Work Orders: ' || COUNT(*)::text FROM maintenance_work_orders WHERE enterprise_id=1;
SELECT 'Reminders: ' || COUNT(*)::text FROM maintenance_reminders WHERE enterprise_id=1;
SELECT 'Downtime Logs: ' || COUNT(*)::text FROM maintenance_downtime_logs WHERE enterprise_id=1;
