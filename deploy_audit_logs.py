#!/usr/bin/env python3
"""Deploy audit log wiring + all pending changes to production server."""
import paramiko
import os
import time

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = 'Vab@2025'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'

# All changed files to upload (API + Frontend)
FILES = [
    # Audit logs module
    'API/src/modules/audit-logs/audit-logs.controller.ts',
    'API/src/modules/audit-logs/audit-logs.service.ts',
    # Auth
    'API/src/modules/auth/auth.service.ts',
    'API/src/modules/auth/strategies/jwt.strategy.ts',
    # Customers
    'API/src/modules/customers/customers.controller.ts',
    'API/src/modules/customers/customers.service.ts',
    # Employees
    'API/src/modules/employees/employees.controller.ts',
    'API/src/modules/employees/employees.service.ts',
    # Enquiries
    'API/src/modules/enquiries/enquiries.controller.ts',
    'API/src/modules/enquiries/enquiries.service.ts',
    # Quotations
    'API/src/modules/quotations/quotations.controller.ts',
    'API/src/modules/quotations/quotations.service.ts',
    # Invoices
    'API/src/modules/invoices/invoices.controller.ts',
    'API/src/modules/invoices/invoices.service.ts',
    # Sales orders
    'API/src/modules/sales-orders/sales-orders.controller.ts',
    'API/src/modules/sales-orders/sales-orders.service.ts',
    # Purchase orders
    'API/src/modules/purchase-orders/purchase-orders.service.ts',
    # Material requests
    'API/src/modules/material-requests/material-requests.service.ts',
    # Indents
    'API/src/modules/indents/indents.controller.ts',
    'API/src/modules/indents/indents.service.ts',
    # Frontend
    'Frontend/src/lib/api/audit-logs.ts',
    'Frontend/src/app/(dashboard)/settings/audit-logs/page.tsx',
]

def run_cmd(ssh, cmd, timeout=300):
    print(f'\n>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('ascii', errors='replace')
    err = stderr.read().decode('ascii', errors='replace')
    if out.strip():
        print(out[-3000:].encode('ascii', errors='replace').decode('ascii'))
    if err.strip():
        print('STDERR:', err[-1000:].encode('ascii', errors='replace').decode('ascii'))
    return out, err

def upload_files(ssh):
    sftp = ssh.open_sftp()
    for rel in FILES:
        local = os.path.join(LOCAL_BASE, rel.replace('/', os.sep))
        remote_rel = rel.lower().replace('frontend/', 'frontend/').replace('api/', 'api/')
        # server uses lowercase api/ and frontend/
        remote = f"{REMOTE_BASE}/{rel.replace('API/', 'api/').replace('Frontend/', 'frontend/')}"
        # ensure dir
        remote_dir = remote.rsplit('/', 1)[0]
        try:
            sftp.makedirs(remote_dir)
        except Exception:
            pass
        try:
            sftp.put(local, remote)
            print(f'  uploaded: {rel}')
        except Exception as e:
            print(f'  FAILED: {rel} -> {e}')
    sftp.close()

def main():
    print('Connecting...')
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print('Connected.')

    print('\n=== Uploading files ===')
    upload_files(ssh)

    print('\n=== Building API ===')
    run_cmd(ssh, 'cd /var/www/html/enterprise/api && npx nest build 2>&1', timeout=120)

    print('\n=== Restarting API ===')
    run_cmd(ssh, 'pm2 restart vab-api && sleep 3 && pm2 status', timeout=30)

    print('\n=== Building Frontend ===')
    print('(this takes a few minutes...)')
    run_cmd(ssh, 'cd /var/www/html/enterprise/frontend && npm run build 2>&1', timeout=600)

    print('\n=== Restarting Frontend ===')
    run_cmd(ssh, 'pm2 restart vab-frontend && sleep 3 && pm2 status', timeout=30)

    print('\n=== Done! ===')
    ssh.close()

if __name__ == '__main__':
    main()
