#!/usr/bin/env python3
"""Deploy API service management modules to server."""

import paramiko
import os

SERVER = "64.235.43.187"
USER = "root"
PASSWORD = "VABINFO@321"

LOCAL_BASE = r"C:\Users\UNITECH2\Desktop\enterprise"
REMOTE_BASE = "/var/www/html/enterprise/api"

# New module files + modified files
API_FILES = [
    # New modules - product-types
    "API/src/modules/product-types/product-types.controller.ts",
    "API/src/modules/product-types/product-types.module.ts",
    "API/src/modules/product-types/product-types.service.ts",
    "API/src/modules/product-types/dto/create-product-type.dto.ts",
    "API/src/modules/product-types/dto/update-product-type.dto.ts",
    "API/src/modules/product-types/entities/product-type.entity.ts",
    "API/src/modules/product-types/entities/service-rule.entity.ts",
    # New modules - service-products
    "API/src/modules/service-products/service-products.controller.ts",
    "API/src/modules/service-products/service-products.module.ts",
    "API/src/modules/service-products/service-products.service.ts",
    "API/src/modules/service-products/service.scheduler.ts",
    "API/src/modules/service-products/dto/create-service-product.dto.ts",
    "API/src/modules/service-products/dto/update-service-product.dto.ts",
    "API/src/modules/service-products/entities/service-product.entity.ts",
    # New modules - service-events
    "API/src/modules/service-events/service-events.controller.ts",
    "API/src/modules/service-events/service-events.module.ts",
    "API/src/modules/service-events/service-events.service.ts",
    "API/src/modules/service-events/entities/service-event.entity.ts",
    # New modules - service-bookings
    "API/src/modules/service-bookings/service-bookings.controller.ts",
    "API/src/modules/service-bookings/service-bookings.module.ts",
    "API/src/modules/service-bookings/service-bookings.service.ts",
    "API/src/modules/service-bookings/dto/create-service-booking.dto.ts",
    "API/src/modules/service-bookings/entities/service-booking.entity.ts",
    # Modified files
    "API/src/app.module.ts",
    "API/src/common/constants/permissions.ts",
    "API/src/modules/manufacturing/manufacturing.module.ts",
    "API/src/modules/manufacturing/manufacturing.service.ts",
]

def ensure_remote_dir(sftp, remote_path):
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
            except Exception:
                pass

def main():
    print(f"Connecting to {SERVER}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER, username=USER, password=PASSWORD, timeout=30)
    print("Connected.")

    sftp = client.open_sftp()

    for local_rel in API_FILES:
        local_path = os.path.join(LOCAL_BASE, local_rel)
        if not os.path.exists(local_path):
            print(f"  SKIP (not found locally): {local_rel}")
            continue

        # "API/src/..." -> "/var/www/html/enterprise/api/src/..."
        rel_from_api = local_rel.replace("API/", "", 1).replace("\\", "/")
        remote_path = REMOTE_BASE + "/src/" + rel_from_api.replace("src/", "", 1)

        remote_dir = "/".join(remote_path.split("/")[:-1])
        ensure_remote_dir(sftp, remote_dir)

        try:
            sftp.put(local_path, remote_path)
            print(f"  OK: {remote_path}")
        except Exception as e:
            print(f"  ERROR: {remote_path}: {e}")

    sftp.close()

    print("\nBuilding API (nest build)...")
    stdin, stdout, stderr = client.exec_command(
        "cd /var/www/html/enterprise/api && npx nest build > /tmp/api-build.log 2>&1; echo BUILD_EXIT:$?",
        timeout=180
    )
    stdout.channel.set_combine_stderr(True)
    result = stdout.read().decode('utf-8', errors='replace').strip()
    print(result)

    # Show build log
    stdin2, stdout2, stderr2 = client.exec_command("cat /tmp/api-build.log")
    log = stdout2.read().decode('utf-8', errors='replace')
    print(log[-3000:] if len(log) > 3000 else log)

    if "BUILD_EXIT:0" in result:
        print("\nRestarting vab-api...")
        stdin3, stdout3, stderr3 = client.exec_command("pm2 restart vab-api 2>&1")
        print(stdout3.read().decode('utf-8', errors='replace'))

        import time; time.sleep(3)
        stdin4, stdout4, stderr4 = client.exec_command("pm2 list --no-color 2>&1")
        print(stdout4.read().decode('utf-8', errors='replace'))
    else:
        print("\nBuild FAILED. Check /tmp/api-build.log on server.")

    client.close()

if __name__ == "__main__":
    main()
