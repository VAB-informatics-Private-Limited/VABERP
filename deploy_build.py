#!/usr/bin/env python3
"""Run remote build and restart after file upload."""
import sys
import paramiko

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'

# Force stdout to utf-8
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def run_remote(client, cmd, desc):
    print(f"\n>>> {desc}")
    print(f"    $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        for line in out.splitlines():
            safe = line.encode('ascii', errors='replace').decode('ascii')
            print('   ', safe)
    if err:
        for line in err.splitlines():
            safe = line.encode('ascii', errors='replace').decode('ascii')
            print('  ERR:', safe)
    exit_code = stdout.channel.recv_exit_status()
    print(f"    Exit code: {exit_code}")
    return exit_code

def main():
    print(f"Connecting to {HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("Connected.")

    # API was already built (exit 0). Just restart.
    run_remote(client, 'pm2 restart vab-api 2>&1 | cat', 'Restarting vab-api...')

    # Build Frontend
    rc = run_remote(client,
        'cd /var/www/html/enterprise/frontend && npm run build 2>&1',
        'Building Frontend (Next.js)... (may take a few minutes)')
    if rc != 0:
        print("WARNING: Frontend build returned non-zero exit code")

    run_remote(client, 'pm2 restart vab-frontend 2>&1 | cat', 'Restarting vab-frontend...')
    run_remote(client, 'pm2 list 2>&1 | cat', 'PM2 process status')

    client.close()
    print("\nDeploy complete!")

if __name__ == '__main__':
    main()
