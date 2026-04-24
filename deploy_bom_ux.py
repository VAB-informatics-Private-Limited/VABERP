#!/usr/bin/env python3
"""Deploy BOM removal from product form + tier-discount auto-apply in quotation."""
import os, sys, paramiko  # noqa: E401

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'
DIR_MAP = [('API/', 'api/'), ('Frontend/', 'frontend/')]

FILES = [
    'Frontend/src/components/products/ProductForm.tsx',
    'Frontend/src/app/(dashboard)/products/[id]/edit/page.tsx',
    'Frontend/src/components/quotations/QuotationBuilder.tsx',
]

sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def remote_path(local_rel):
    for lp, rp in DIR_MAP:
        if local_rel.startswith(lp):
            return REMOTE_BASE + '/' + rp + local_rel[len(lp):]
    return None


def run_remote(client, cmd, desc, timeout=900):
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
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = client.open_sftp()
    for rel in FILES:
        rel_u = rel.replace('\\', '/')
        rpath = remote_path(rel_u)
        local_full = os.path.join(LOCAL_BASE, rel_u.replace('/', os.sep))
        sftp.put(local_full, rpath)
        print(f"  OK: {rel_u}")
    sftp.close()

    run_remote(client, 'cd /var/www/html/enterprise/frontend && npm run build 2>&1 | tail -10', 'Building Frontend...')
    run_remote(client, 'pm2 restart vab-frontend 2>&1 | cat', 'Restarting vab-frontend...')

    client.close()
    print("\nDeploy complete!")


if __name__ == '__main__':
    main()
