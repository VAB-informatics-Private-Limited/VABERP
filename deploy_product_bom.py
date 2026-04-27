#!/usr/bin/env python3
"""Deploy per-product Bill of Materials feature to VAB Enterprise server.

Targets ONLY the files introduced/modified for the BOM feature. Order:
  1. Upload changed files via SFTP.
  2. Baseline the pre-existing migrations (they were applied historically via
     TypeORM synchronize; the migrations table is empty so migration:run tries
     to replay all of them and fails).
  3. Run `npm run migration:run` — only the new ProductBom migration will run.
  4. Build API + restart vab-api.
  5. Build frontend + restart vab-frontend.
"""
import os, sys, paramiko  # noqa: E401

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'
DIR_MAP = [('API/', 'api/'), ('Frontend/', 'frontend/')]

FILES = [
    # Backend — modified
    'API/src/modules/manufacturing/entities/bom.entity.ts',
    'API/src/modules/manufacturing/manufacturing.controller.ts',
    'API/src/modules/manufacturing/manufacturing.module.ts',
    'API/src/modules/manufacturing/manufacturing.service.ts',
    'API/src/modules/products/dto/create-product.dto.ts',
    'API/src/modules/products/dto/index.ts',
    'API/src/modules/products/entities/product.entity.ts',
    'API/src/modules/products/products.controller.ts',
    'API/src/modules/products/products.module.ts',
    'API/src/modules/products/products.service.ts',
    # Backend — new
    'API/src/database/migrations/1746100000000-ProductBom.ts',
    'API/src/modules/products/dto/product-bom.dto.ts',
    'API/src/modules/products/entities/product-bom-item.entity.ts',
    'API/src/modules/products/entities/product-bom.entity.ts',
    'API/src/modules/products/product-bom.service.ts',
    # Frontend — modified
    'Frontend/src/app/(dashboard)/manufacturing/po/[id]/page.tsx',
    'Frontend/src/app/(dashboard)/products/[id]/edit/page.tsx',
    'Frontend/src/components/products/ProductForm.tsx',
    'Frontend/src/components/products/ProductTable.tsx',
    'Frontend/src/lib/api/bom.ts',
    'Frontend/src/lib/api/products.ts',
    'Frontend/src/lib/validations/product.ts',
    'Frontend/src/types/product.ts',
    # Frontend — new
    'Frontend/src/components/products/ProductBomEditor.tsx',
    'Frontend/src/lib/api/product-bom.ts',
    'Frontend/src/types/product-bom.ts',
]

# SQL to baseline the 14 pre-existing migrations. Idempotent — re-running is safe.
BASELINE_SQL = """
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  "timestamp" BIGINT NOT NULL,
  "name" VARCHAR NOT NULL
);

INSERT INTO migrations ("timestamp", "name")
SELECT v."timestamp", v."name"
FROM (VALUES
  (1740900000000::bigint, 'CreateSourcesTable1740900000000'),
  (1741000000000::bigint, 'AddInventoryPriority1741000000000'),
  (1741100000000::bigint, 'AddIndentSource1741100000000'),
  (1741200000000::bigint, 'AddGranularPermissions1741200000000'),
  (1741300000000::bigint, 'ConvertPermissionsToJsonb1741300000000'),
  (1742000000000::bigint, 'CreateLocationsTable1742000000000'),
  (1742100000000::bigint, 'AddCountryToEnquiries1742100000000'),
  (1742200000000::bigint, 'AddMissingEnquiryColumns1742200000000'),
  (1742300000000::bigint, 'AddPoCancelledToQuotations1742300000000'),
  (1742400000000::bigint, 'AddCrmModule1742400000000'),
  (1744000000000::bigint, 'CreateProformaInvoices1744000000000'),
  (1745000000000::bigint, 'CreatePrintTemplates1745000000000'),
  (1745100000000::bigint, 'AddUnderVerificationToPO1745100000000'),
  (1746000000000::bigint, 'CreateServiceManagement1746000000000')
) AS v("timestamp", "name")
WHERE NOT EXISTS (
  SELECT 1 FROM migrations m WHERE m."timestamp" = v."timestamp"
);

SELECT COUNT(*) AS baseline_rows FROM migrations;
"""

sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def remote_path(local_rel):
    for lp, rp in DIR_MAP:
        if local_rel.startswith(lp):
            return REMOTE_BASE + '/' + rp + local_rel[len(lp):]
    return None


def ensure_remote_dir(sftp, rpath):
    parts = rpath.split('/')
    path = ''
    for part in parts[:-1]:
        if not part:
            path = '/'
            continue
        path = path.rstrip('/') + '/' + part
        try:
            sftp.stat(path)
        except FileNotFoundError:
            sftp.mkdir(path)


def run_remote(client, cmd, desc, timeout=600):
    print(f"\n>>> {desc}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    for line in (out + err).splitlines():
        print('   ', line.encode('ascii', errors='replace').decode('ascii'))
    rc = stdout.channel.recv_exit_status()
    print(f"    Exit: {rc}")
    return rc


def main():
    print(f"Connecting to {HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("Connected.")

    sftp = client.open_sftp()
    print(f"\nUploading {len(FILES)} files (BOM feature only)...")
    ok = err_count = 0
    for rel in FILES:
        rel_u = rel.replace('\\', '/')
        rpath = remote_path(rel_u)
        local_full = os.path.join(LOCAL_BASE, rel_u.replace('/', os.sep))
        if not os.path.isfile(local_full):
            print(f"  MISS: {rel_u}")
            err_count += 1
            continue
        try:
            ensure_remote_dir(sftp, rpath)
            sftp.put(local_full, rpath)
            print(f"  OK: {rel_u}")
            ok += 1
        except Exception as e:
            print(f"  ERR: {rel_u} -> {e}")
            err_count += 1

    # Write baseline SQL to a temp file on the server.
    baseline_path = '/tmp/product_bom_baseline.sql'
    try:
        with sftp.open(baseline_path, 'w') as f:
            f.write(BASELINE_SQL)
        print(f"  OK: uploaded {baseline_path}")
    except Exception as e:
        print(f"  ERR: baseline SQL -> {e}")
        err_count += 1
    sftp.close()

    print(f"\nUploaded: {ok} files + 1 SQL, Errors: {err_count}")
    if err_count:
        print("ABORT: upload errors — not running migration/build.")
        client.close()
        sys.exit(1)

    # Clean stray migration from old path (from earlier iteration).
    run_remote(
        client,
        'rm -f /var/www/html/enterprise/api/src/migrations/1746100000000-ProductBom.ts 2>&1',
        'Cleaning up stray migration copy...',
    )

    # Baseline the 14 pre-existing migrations.
    rc = run_remote(
        client,
        'cd /var/www/html/enterprise/api && '
        'set -a && source .env && set +a && '
        'PGPASSWORD="$DB_PASSWORD" psql '
        '-h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_DATABASE" '
        '-v ON_ERROR_STOP=1 -f /tmp/product_bom_baseline.sql 2>&1',
        'Baselining 14 pre-existing migrations...',
        timeout=120,
    )
    if rc != 0:
        print("\nBASELINE FAILED — aborting.")
        client.close()
        sys.exit(1)

    # Run migration — only the new one should execute now.
    rc = run_remote(
        client,
        'cd /var/www/html/enterprise/api && npm run migration:run 2>&1',
        'Running DB migration (product_boms + backfill)...',
        timeout=600,
    )
    if rc != 0:
        print("\nMIGRATION FAILED — aborting build/restart. Investigate server logs above.")
        client.close()
        sys.exit(1)

    run_remote(client, 'cd /var/www/html/enterprise/api && npx nest build 2>&1', 'Building API...')
    run_remote(client, 'pm2 restart vab-api 2>&1 | cat', 'Restarting vab-api...')
    run_remote(client, 'cd /var/www/html/enterprise/frontend && npm run build 2>&1', 'Building Frontend...', timeout=900)
    run_remote(client, 'pm2 restart vab-frontend 2>&1 | cat', 'Restarting vab-frontend...')
    run_remote(client, 'pm2 list 2>&1 | cat', 'PM2 status')

    client.close()
    print("\nDeploy complete!")


if __name__ == '__main__':
    main()
