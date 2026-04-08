#!/usr/bin/env python3
import paramiko, os

HOST = '64.235.43.187'; USER = 'root'; PASSWORD = 'Vab@2025'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'

FILES = [
    # Backend
    'API/src/modules/employees/entities/menu-permission.entity.ts',
    'API/src/common/guards/permission.guard.ts',
    'API/src/common/decorators/index.ts',
    'API/src/common/decorators/own-data-only.decorator.ts',
    'API/src/modules/employees/employees.service.ts',
    'API/src/modules/enquiries/enquiries.controller.ts',
    'API/src/modules/enquiries/enquiries.service.ts',
    'API/src/modules/quotations/quotations.controller.ts',
    'API/src/modules/quotations/quotations.service.ts',
    'API/src/modules/customers/customers.controller.ts',
    'API/src/modules/customers/customers.service.ts',
    # Frontend
    'Frontend/src/lib/api/employees.ts',
    'Frontend/src/app/(dashboard)/employees/[id]/permissions/page.tsx',
]

def run_cmd(ssh, cmd, timeout=300):
    print(f'\n>>> {cmd}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('ascii', errors='replace')
    err = stderr.read().decode('ascii', errors='replace')
    if out.strip(): print(out[-3000:].encode('ascii', errors='replace').decode('ascii'))
    if err.strip(): print('ERR:', err[-500:].encode('ascii', errors='replace').decode('ascii'))

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
print('Connected.')

sftp = ssh.open_sftp()
for rel in FILES:
    local = os.path.join(LOCAL_BASE, rel.replace('/', os.sep))
    remote = f"{REMOTE_BASE}/{rel.replace('API/', 'api/').replace('Frontend/', 'frontend/')}"
    # Handle special chars in path (like [id])
    remote_dir = remote.rsplit('/', 1)[0]
    try: sftp.mkdir(remote_dir)
    except: pass
    sftp.put(local, remote)
    print(f'  uploaded: {rel}')
sftp.close()

print('\n=== Building API ===')
run_cmd(ssh, 'cd /var/www/html/enterprise/api && npx nest build 2>&1', timeout=120)

print('\n=== Restarting API ===')
run_cmd(ssh, 'pm2 restart vab-api && sleep 3 && pm2 show vab-api 2>&1 | grep -E "status|restart"', timeout=30)

print('\n=== Building Frontend ===')
run_cmd(ssh, 'cd /var/www/html/enterprise/frontend && npm run build 2>&1', timeout=600)

print('\n=== Restarting Frontend ===')
run_cmd(ssh, 'pm2 restart vab-frontend && sleep 3 && pm2 show vab-frontend 2>&1 | grep -E "status|restart"', timeout=30)

print('\nDone!')
ssh.close()
