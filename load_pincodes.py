#!/usr/bin/env python3
"""Bulk-load Indian cities + pincodes into production DB.

Reads data.json (~40k rows), maps state names to DB state IDs, uploads a
consolidated CSV to the server, then issues SQL that:
  1) upserts missing cities into public.cities (matched case-insensitively)
  2) inserts all pincodes into public.pincodes joined to the resolved city
Both idempotent — safe to re-run.
"""
import csv, io, json, sys, paramiko

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'

LOCAL_JSON = r'C:\Users\UNITECH2\Desktop\enterprise\india_pincodes.json'
REMOTE_CSV = '/tmp/india_loc.csv'

# Dataset state name -> DB state name (see `states` table)
# Unmapped names: Ladakh (not in dataset), Telangana (dataset predates 2014 split)
STATE_MAP = {
    'Andaman Nicobar':        'Andaman and Nicobar Islands',
    'Dadra & Nagar Haveli':   'Dadra and Nagar Haveli and Daman and Diu',
    'Daman & Diu':            'Dadra and Nagar Haveli and Daman and Diu',
    'Jammu & Kashmir':        'Jammu and Kashmir',
    'Lakshdweep':             'Lakshadweep',
    'Orissa':                 'Odisha',
    'Pondicherry':            'Puducherry',
    'Uttaranchal':            'Uttarakhand',
    # Everything else is a direct match.
}

sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def main():
    # 1) Load the JSON dataset
    print('Reading JSON dataset...')
    data = json.load(open(LOCAL_JSON, encoding='utf-8-sig'))
    rows = data['Sheet1']
    print(f'  {len(rows):,} records')

    # 2) Connect and fetch the state id map from production
    print('\nConnecting to production...')
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sqlcmd = 'psql -h localhost -p 2263 -U postgres -d vab_enterprise -t -A -c "SELECT id, name FROM states WHERE country_id = 1;"'
    _, so, _ = c.exec_command(sqlcmd, timeout=30)
    raw = so.read().decode('utf-8')
    state_id_by_name = {}
    for line in raw.strip().splitlines():
        if '|' not in line:
            continue
        sid, sname = line.split('|', 1)
        state_id_by_name[sname.strip()] = int(sid.strip())
    print(f'  Loaded {len(state_id_by_name)} DB states')

    # 3) Build CSV rows (state_id, city, pincode)
    print('\nBuilding CSV in memory...')
    unmapped_states = set()
    out = io.StringIO()
    w = csv.writer(out)
    kept = 0
    for r in rows:
        ds_state = r['State']
        db_state = STATE_MAP.get(ds_state, ds_state)
        sid = state_id_by_name.get(db_state)
        if sid is None:
            unmapped_states.add(ds_state)
            continue
        city = (r['City'] or '').strip()
        pin = (r['Pincode'] or '').strip()
        if not city or not pin or not pin.isdigit() or len(pin) != 6:
            continue
        w.writerow([sid, city, pin])
        kept += 1
    csv_bytes = out.getvalue().encode('utf-8')
    print(f'  {kept:,} valid rows  ({len(csv_bytes)/1024:.1f} KB)')
    if unmapped_states:
        print(f'  Skipped states (no DB match): {sorted(unmapped_states)}')

    # 4) Upload CSV
    print('\nUploading CSV to server...')
    sftp = c.open_sftp()
    with sftp.file(REMOTE_CSV, 'wb') as f:
        f.write(csv_bytes)
    sftp.close()
    print(f'  Uploaded to {REMOTE_CSV}')

    # 5) Load via psql
    load_sql = f"""
SET client_min_messages = WARNING;
BEGIN;

CREATE TEMP TABLE tmp_loc (state_id INT, city_name TEXT, pincode TEXT);
\\COPY tmp_loc (state_id, city_name, pincode) FROM '{REMOTE_CSV}' WITH (FORMAT csv);

-- 1) Insert new cities (case-insensitive match against existing rows)
INSERT INTO cities (state_id, name, is_active, created_date, modified_date)
SELECT DISTINCT ON (state_id, lower(city_name)) state_id, city_name, true, NOW(), NOW()
  FROM tmp_loc t
 WHERE NOT EXISTS (
   SELECT 1 FROM cities c
    WHERE c.state_id = t.state_id AND lower(c.name) = lower(t.city_name)
 );

-- 2) Insert pincodes, joined to resolved city (case-insensitive)
INSERT INTO pincodes (city_id, code, is_active, created_date, modified_date)
SELECT DISTINCT c.id, t.pincode, true, NOW(), NOW()
  FROM tmp_loc t
  JOIN cities c ON c.state_id = t.state_id AND lower(c.name) = lower(t.city_name)
 ON CONFLICT (city_id, code) DO NOTHING;

COMMIT;

SELECT 'cities total'    AS label, COUNT(*) FROM cities
UNION ALL SELECT 'pincodes total',     COUNT(*) FROM pincodes;
"""
    script = '/tmp/load_locations.sql'
    sftp = c.open_sftp()
    with sftp.file(script, 'w') as f:
        f.write(load_sql)
    sftp.close()

    print('\nRunning SQL on server (this may take a moment)...')
    cmd = f'psql -h localhost -p 2263 -U postgres -d vab_enterprise -v ON_ERROR_STOP=1 -f {script} 2>&1'
    _, so, se = c.exec_command(cmd, timeout=600)
    out_txt = (so.read() + se.read()).decode('utf-8', errors='replace')
    print(out_txt)
    rc = so.channel.recv_exit_status()
    print(f'\npsql exit: {rc}')

    c.close()


if __name__ == '__main__':
    main()
