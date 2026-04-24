-- Seed DEMO waste vendors for every active enterprise.
-- Clearly marked as DEMO so they are not mistaken for real records.
-- Idempotent: skip if a party with the same code already exists.

BEGIN;

INSERT INTO waste_parties (
  enterprise_id, party_code, company_name, party_type,
  contact_person, phone, email, address,
  gst_number, pollution_board_cert, handles_hazardous,
  payment_terms, status, rating, notes
)
SELECT e.id, v.party_code, v.company_name, v.party_type,
       v.contact_person, v.phone, v.email, v.address,
       NULL, NULL, v.handles_hazardous,
       v.payment_terms, 'active', NULL,
       'Demo vendor — delete when real vendors are added'
FROM enterprises e
CROSS JOIN (VALUES
  ('DEMO-WV-001', 'DEMO — Recycler A',        'vendor',   'Demo Contact 1', '0000000001', 'demo1@example.test', 'Demo address 1',     FALSE, 'net_30'),
  ('DEMO-WV-002', 'DEMO — Metal Scrap B',     'vendor',   'Demo Contact 2', '0000000002', 'demo2@example.test', 'Demo address 2',     FALSE, 'advance'),
  ('DEMO-WV-003', 'DEMO — Hazchem Disposer C', 'vendor',  'Demo Contact 3', '0000000003', 'demo3@example.test', 'Demo address 3',     TRUE,  'net_15'),
  ('DEMO-WV-004', 'DEMO — e-Waste Pickup D',  'both',     'Demo Contact 4', '0000000004', 'demo4@example.test', 'Demo address 4',     FALSE, 'net_30'),
  ('DEMO-WV-005', 'DEMO — Compost Buyer E',   'customer', 'Demo Contact 5', '0000000005', 'demo5@example.test', 'Demo address 5',     FALSE, 'immediate')
) AS v(party_code, company_name, party_type, contact_person, phone, email, address,
        handles_hazardous, payment_terms)
WHERE NOT EXISTS (
  SELECT 1 FROM waste_parties wp
  WHERE wp.enterprise_id = e.id AND wp.party_code = v.party_code
);

COMMIT;

SELECT enterprise_id, party_code, company_name, party_type, handles_hazardous
FROM waste_parties
ORDER BY enterprise_id, party_code;
