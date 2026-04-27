#!/usr/bin/env python3
"""Upload and run waste_vendors_seed.sql on the production DB."""
import os, sys, paramiko  # noqa: E401

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'

sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def run_remote(client, cmd, desc, timeout=180):
    print(f"\n>>> {desc}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    for line in (out + err).splitlines():
        print('   ', line.encode('ascii', errors='replace').decode('ascii'))
    return stdout.channel.recv_exit_status()


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = client.open_sftp()
    sftp.put(os.path.join(LOCAL_BASE, 'waste_vendors_seed.sql'), '/tmp/waste_vendors_seed.sql')
    print('  OK: waste_vendors_seed.sql uploaded')
    sftp.close()

    run_remote(
        client,
        'cd /var/www/html/enterprise/api && '
        'set -a && source .env && set +a && '
        'PGPASSWORD="$DB_PASSWORD" psql '
        '-h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_DATABASE" '
        '-v ON_ERROR_STOP=1 -f /tmp/waste_vendors_seed.sql 2>&1',
        'Seeding waste vendors...',
    )

    client.close()
    print("\nDone!")


if __name__ == '__main__':
    main()
