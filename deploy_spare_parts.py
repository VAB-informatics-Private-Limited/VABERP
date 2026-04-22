#!/usr/bin/env python3
"""Deploy Spare Parts ↔ Machinery integration to VAB Enterprise server.

Uploads all new + modified files, rebuilds both services, runs the migration SQL,
and restarts PM2 processes.
"""
import os, sys, subprocess, paramiko

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'
DIR_MAP = [('API/', 'api/'), ('Frontend/', 'frontend/')]

# Full explicit file list — avoids git-status-based enumeration that misses dir contents
FILES = [
    # API — modified
    'API/src/app.module.ts',
    'API/src/common/constants/permissions.ts',
    # API — new migration
    'API/migrations/spare_parts.sql',
    # API — new spare-parts module
    'API/src/modules/spare-parts/entities/spare-part.entity.ts',
    'API/src/modules/spare-parts/entities/machine-spare-map.entity.ts',
    'API/src/modules/spare-parts/entities/machine-spare.entity.ts',
    'API/src/modules/spare-parts/dto/create-spare-part.dto.ts',
    'API/src/modules/spare-parts/dto/update-spare-part.dto.ts',
    'API/src/modules/spare-parts/dto/suggest-spares.dto.ts',
    'API/src/modules/spare-parts/dto/save-machine-spares.dto.ts',
    'API/src/modules/spare-parts/dto/upsert-map.dto.ts',
    'API/src/modules/spare-parts/spare-parts.service.ts',
    'API/src/modules/spare-parts/spare-parts.controller.ts',
    'API/src/modules/spare-parts/spare-parts.module.ts',
    # Frontend — modified
    'Frontend/src/app/(dashboard)/machinery/page.tsx',
    'Frontend/src/app/(dashboard)/machinery/[id]/page.tsx',
    'Frontend/src/components/layout/Sidebar.tsx',
    # Frontend — new API client
    'Frontend/src/lib/api/spare-parts.ts',
    # Frontend — new shared components
    'Frontend/src/components/machinery/SparePartPicker.tsx',
    'Frontend/src/components/machinery/SparesEditableTable.tsx',
    'Frontend/src/components/machinery/SuggestedSparesStep.tsx',
    'Frontend/src/components/machinery/MachineSparesTab.tsx',
    # Frontend — new pages
    'Frontend/src/app/(dashboard)/machinery/spare-parts/page.tsx',
    'Frontend/src/app/(dashboard)/machinery/spare-map/page.tsx',
]

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
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
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
    print("Connected.\n")

    sftp = client.open_sftp()
    print(f"Uploading {len(FILES)} files...")
    ok = err = skipped = 0
    for rel in FILES:
        rel_fs = rel.replace('/', os.sep)
        local_full = os.path.join(LOCAL_BASE, rel_fs)
        if not os.path.isfile(local_full):
            print(f"  SKIP (missing): {rel}")
            skipped += 1
            continue
        rpath = remote_path(rel)
        try:
            ensure_remote_dir(sftp, rpath)
            sftp.put(local_full, rpath)
            print(f"  OK: {rel}")
            ok += 1
        except Exception as e:
            print(f"  ERR: {rel} -> {e}")
            err += 1
    sftp.close()
    print(f"\nUploaded: {ok}, Errors: {err}, Skipped: {skipped}")

    if err:
        print("Upload errors — aborting before build/restart.")
        client.close()
        sys.exit(1)

    # 1. Run migration first (before API restarts so new code sees schema)
    run_remote(
        client,
        'psql -h localhost -p 2263 -U postgres -d vab_enterprise '
        '-f /var/www/html/enterprise/api/migrations/spare_parts.sql 2>&1',
        'Running migration spare_parts.sql',
    )

    # 2. Build API
    rc_api = run_remote(
        client,
        'cd /var/www/html/enterprise/api && npx nest build 2>&1',
        'Building API',
    )
    if rc_api == 0:
        run_remote(client, 'pm2 restart vab-api 2>&1 | cat', 'Restarting vab-api')
    else:
        print("API build failed — skipping restart to keep current vab-api running.")

    # 3. Build Frontend
    rc_fe = run_remote(
        client,
        'cd /var/www/html/enterprise/frontend && npm run build 2>&1',
        'Building Frontend',
        timeout=900,
    )
    if rc_fe == 0:
        run_remote(client, 'pm2 restart vab-frontend 2>&1 | cat', 'Restarting vab-frontend')
    else:
        print("Frontend build failed — skipping restart to keep current vab-frontend running.")

    run_remote(client, 'pm2 list 2>&1 | cat', 'PM2 status')

    client.close()
    print("\nDeploy complete.")


if __name__ == '__main__':
    main()
