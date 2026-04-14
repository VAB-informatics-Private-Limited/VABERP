#!/usr/bin/env python3
"""Deploy frontend files to correct lowercase paths on server."""

import paramiko
import os

SERVER = "64.235.43.187"
USER = "root"
PASSWORD = "VABINFO@321"

LOCAL_BASE = r"C:\Users\UNITECH2\Desktop\enterprise"
REMOTE_BASE = "/var/www/html/enterprise/frontend"

# All frontend files that need to be deployed
FILES = [
    "Frontend/src/components/layout/Sidebar.tsx",
    "Frontend/src/app/(dashboard)/dashboard/page.tsx",
    "Frontend/src/app/(dashboard)/service-products/page.tsx",
    "Frontend/src/app/(dashboard)/service-products/add/page.tsx",
    "Frontend/src/app/(dashboard)/service-products/[id]/page.tsx",
    "Frontend/src/app/(dashboard)/service-events/page.tsx",
    "Frontend/src/app/(dashboard)/service-bookings/page.tsx",
    "Frontend/src/app/(dashboard)/settings/product-types/page.tsx",
    "Frontend/src/lib/api/product-types.ts",
    "Frontend/src/lib/api/service-products.ts",
    "Frontend/src/lib/api/service-events.ts",
    "Frontend/src/lib/api/service-bookings.ts",
    "Frontend/src/types/product-type.ts",
    "Frontend/src/types/service-product.ts",
    "Frontend/src/types/service-event.ts",
    "Frontend/src/types/service-booking.ts",
]

def ensure_remote_dir(sftp, remote_path):
    """Create directory and all parents if they don't exist."""
    parts = remote_path.split('/')
    current = ''
    for part in parts:
        if not part:
            continue
        current = current + '/' + part
        try:
            sftp.stat(current)
        except FileNotFoundError:
            try:
                sftp.mkdir(current)
                print(f"  Created dir: {current}")
            except Exception as e:
                pass  # might already exist from parallel creation

def main():
    print(f"Connecting to {SERVER}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER, username=USER, password=PASSWORD, timeout=30)
    print("Connected.")

    sftp = client.open_sftp()

    for local_rel in FILES:
        # Local path
        local_path = os.path.join(LOCAL_BASE, local_rel)
        if not os.path.exists(local_path):
            print(f"  SKIP (not found locally): {local_rel}")
            continue

        # Remote path: strip "Frontend/" prefix, replace with lowercase remote base
        # e.g. "Frontend/src/components/layout/Sidebar.tsx"
        #   -> "/var/www/html/enterprise/frontend/src/components/layout/Sidebar.tsx"
        rel_from_frontend = local_rel.replace("Frontend/", "", 1).replace("\\", "/")
        remote_path = REMOTE_BASE + "/" + rel_from_frontend

        # Ensure parent dir exists
        remote_dir = "/".join(remote_path.split("/")[:-1])
        ensure_remote_dir(sftp, remote_dir)

        # Upload
        try:
            sftp.put(local_path, remote_path)
            print(f"  OK: {remote_path}")
        except Exception as e:
            print(f"  ERROR uploading {remote_path}: {e}")

    sftp.close()

    print("\nAll files uploaded. Building frontend...")
    stdin, stdout, stderr = client.exec_command(
        "cd /var/www/html/enterprise/frontend && npm run build 2>&1",
        timeout=300
    )
    stdout.channel.set_combine_stderr(True)
    for line in iter(stdout.readline, ''):
        print(line, end='')

    print("\nRestarting vab-frontend...")
    stdin, stdout, stderr = client.exec_command("pm2 restart vab-frontend 2>&1")
    print(stdout.read().decode())

    print("\nDone! Checking PM2 status...")
    stdin, stdout, stderr = client.exec_command("pm2 list 2>&1")
    print(stdout.read().decode())

    client.close()
    print("Deployment complete.")

if __name__ == "__main__":
    main()
