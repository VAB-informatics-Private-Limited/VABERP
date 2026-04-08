#!/usr/bin/env python3
import paramiko
import os

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = 'Vab@2025'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'

FILES = [
    'API/src/modules/audit-logs/audit-logs.controller.ts',
    'API/src/modules/customers/customers.service.ts',
    'API/src/modules/purchase-orders/purchase-orders.service.ts',
    'API/src/modules/material-requests/material-requests.service.ts',
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

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print('Connected.')

    sftp = ssh.open_sftp()
    for rel in FILES:
        local = os.path.join(LOCAL_BASE, rel.replace('/', os.sep))
        remote = f"{REMOTE_BASE}/{rel.replace('API/', 'api/').replace('Frontend/', 'frontend/')}"
        sftp.put(local, remote)
        print(f'  uploaded: {rel}')
    sftp.close()

    print('\n=== Building API ===')
    run_cmd(ssh, 'cd /var/www/html/enterprise/api && npx nest build 2>&1', timeout=120)

    print('\n=== Restarting API ===')
    run_cmd(ssh, 'pm2 restart vab-api && sleep 3 && pm2 status 2>&1', timeout=30)

    print('\nDone!')
    ssh.close()

if __name__ == '__main__':
    main()
