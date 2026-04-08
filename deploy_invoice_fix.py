#!/usr/bin/env python3
"""Deploy invoice balance fix and new payments page."""
import sys
import os
import paramiko

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CHANGED_FILES = [
    ('API/src/modules/invoices/invoices.service.ts',   'api/src/modules/invoices/invoices.service.ts'),
    ('API/src/modules/invoices/invoices.controller.ts','api/src/modules/invoices/invoices.controller.ts'),
    ('Frontend/src/lib/api/invoices.ts',               'frontend/src/lib/api/invoices.ts'),
    ('Frontend/src/app/(dashboard)/payments/page.tsx', 'frontend/src/app/(dashboard)/payments/page.tsx'),
]

def ensure_remote_dir(sftp, remote_file_path):
    parts = remote_file_path.split('/')
    path = ''
    for part in parts[:-1]:
        if not part:
            path = '/'; continue
        path = path.rstrip('/') + '/' + part
        try:
            sftp.stat(path)
        except FileNotFoundError:
            sftp.mkdir(path)

def run_remote(client, cmd, desc):
    print(f"\n>>> {desc}")
    print(f"    $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    for line in (out + err).splitlines():
        print('   ', line.encode('ascii', errors='replace').decode('ascii'))
    rc = stdout.channel.recv_exit_status()
    print(f"    Exit code: {rc}")
    return rc

def main():
    print(f"Connecting to {HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("Connected.\n")

    sftp = client.open_sftp()
    for local_rel, remote_rel in CHANGED_FILES:
        local_full = os.path.join(LOCAL_BASE, local_rel.replace('/', os.sep))
        remote_full = f"{REMOTE_BASE}/{remote_rel}"
        ensure_remote_dir(sftp, remote_full)
        sftp.put(local_full, remote_full)
        print(f"  OK: {local_rel}")
    sftp.close()

    run_remote(client, 'cd /var/www/html/enterprise/api && npx nest build 2>&1', 'Building API...')
    run_remote(client, 'pm2 restart vab-api 2>&1 | cat', 'Restarting vab-api...')
    run_remote(client, 'cd /var/www/html/enterprise/frontend && npm run build 2>&1', 'Building Frontend...')
    run_remote(client, 'pm2 restart vab-frontend 2>&1 | cat', 'Restarting vab-frontend...')
    run_remote(client, 'pm2 list 2>&1 | cat', 'PM2 status')

    client.close()
    print("\nDone!")

if __name__ == '__main__':
    main()
