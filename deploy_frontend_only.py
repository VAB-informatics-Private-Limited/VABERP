#!/usr/bin/env python3
import sys
import paramiko

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def run_remote(client, cmd, desc, timeout=600):
    print(f"\n>>> {desc}")
    print(f"    $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
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
    print("Connected.")

    run_remote(client,
        'cd /var/www/html/enterprise/frontend && npm run build 2>&1',
        'Building Frontend (Next.js)...', timeout=600)

    run_remote(client, 'pm2 restart vab-frontend 2>&1 | cat', 'Restarting vab-frontend...')
    run_remote(client, 'pm2 list 2>&1 | cat', 'PM2 status')

    client.close()
    print("\nDone!")

if __name__ == '__main__':
    main()
