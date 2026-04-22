#!/usr/bin/env python3
"""Deploy cascading State -> City -> Pincode feature for the enquiry form.

Uploads all changed/new files, runs the pincodes migration, rebuilds both
services, restarts PM2.
"""
import os, sys, paramiko

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'
DIR_MAP = [('API/', 'api/'), ('Frontend/', 'frontend/')]

FILES = [
    # API
    'API/migrations/pincodes.sql',
    'API/src/modules/locations/entities/pincode.entity.ts',
    'API/src/modules/locations/locations.module.ts',
    'API/src/modules/locations/locations.service.ts',
    'API/src/modules/locations/locations.controller.ts',
    # Frontend
    'Frontend/src/lib/api/locations.ts',
    'Frontend/src/components/enquiries/EnquiryForm.tsx',
    # Earlier in-session changes still to push:
    'Frontend/src/lib/api/client.ts',
    'Frontend/src/lib/api/branding.ts',
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
    print("Connected.\n")

    sftp = client.open_sftp()
    print(f"Uploading {len(FILES)} files...")
    ok = err = 0
    for rel in FILES:
        local_full = os.path.join(LOCAL_BASE, rel.replace('/', os.sep))
        if not os.path.isfile(local_full):
            print(f"  MISSING: {rel}")
            err += 1
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
    print(f"\nUploaded: {ok}, Errors: {err}")
    if err:
        client.close()
        sys.exit(1)

    run_remote(
        client,
        'psql -h localhost -p 2263 -U postgres -d vab_enterprise '
        '-f /var/www/html/enterprise/api/migrations/pincodes.sql 2>&1',
        'Running migration pincodes.sql',
    )

    rc = run_remote(
        client,
        'cd /var/www/html/enterprise/api && npx nest build 2>&1',
        'Building API', 600,
    )
    if rc == 0:
        run_remote(client, 'pm2 restart vab-api 2>&1 | tail -5', 'Restart vab-api')
    else:
        print("API build failed — skipping restart.")

    rc = run_remote(
        client,
        'cd /var/www/html/enterprise/frontend && npm run build 2>&1',
        'Building Frontend', 900,
    )
    if rc == 0:
        run_remote(client, 'pm2 restart vab-frontend 2>&1 | tail -5', 'Restart vab-frontend')
    else:
        print("Frontend build failed — skipping restart.")

    run_remote(client, 'pm2 list 2>&1 | grep -E "vab-api|vab-frontend"', 'PM2 status')
    client.close()
    print("\nDeploy complete.")


if __name__ == '__main__':
    main()
