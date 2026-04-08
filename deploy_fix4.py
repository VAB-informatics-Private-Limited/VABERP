#!/usr/bin/env python3
"""Deploy: run DB migration + fix manufacturing job card quotation join + restart API."""

import sys
import paramiko
from pathlib import Path

HOST = "64.235.43.187"
PORT = 22
USER = "root"
PASSWORD = "6BH07w0xB48?~kW-F"

REMOTE_API = "/var/www/html/enterprise/api"
LOCAL_API   = Path("C:/Users/UNITECH2/Desktop/enterprise/API")

FILES_TO_UPLOAD = [
    ("src/modules/manufacturing/manufacturing.service.ts",
     f"{REMOTE_API}/src/modules/manufacturing/manufacturing.service.ts"),
    ("src/database/migrations/1742300000000-AddPoCancelledToQuotations.ts",
     f"{REMOTE_API}/src/database/migrations/1742300000000-AddPoCancelledToQuotations.ts"),
]

def run_cmd(ssh, cmd):
    print(f"\n$ {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    for line in stdout:
        try:
            print(line, end="")
        except UnicodeEncodeError:
            print(line.encode('ascii', errors='replace').decode('ascii'), end="")
    rc = stdout.channel.recv_exit_status()
    if rc != 0:
        err = stderr.read().decode(errors='replace')
        if err:
            print(f"STDERR: {err}")
    return rc

def main():
    print("Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    print("Connected!")

    sftp = ssh.open_sftp()
    print("\n=== Uploading changed files ===")
    for local_rel, remote_path in FILES_TO_UPLOAD:
        local_path = LOCAL_API / local_rel
        sftp.put(str(local_path), remote_path)
        print(f"  uploaded: {remote_path}")
    sftp.close()

    # Read DB env vars from server
    print("\n=== Reading DB config ===")
    _, stdout, _ = ssh.exec_command(f"cat {REMOTE_API}/.env | grep -E '^DB_'")
    env_lines = stdout.read().decode(errors='replace').strip().split('\n')
    db_config = {}
    for line in env_lines:
        if '=' in line:
            k, v = line.split('=', 1)
            db_config[k.strip()] = v.strip()

    db_host = db_config.get('DB_HOST', 'localhost')
    db_port = db_config.get('DB_PORT', '5432')
    db_user = db_config.get('DB_USERNAME', 'postgres')
    db_pass = db_config.get('DB_PASSWORD', '')
    db_name = db_config.get('DB_DATABASE', 'vab_enterprise')
    print(f"  DB: {db_user}@{db_host}:{db_port}/{db_name}")

    print("\n=== Running DB migration (ALTER TABLE) ===")
    sql = (
        "ALTER TABLE quotations "
        "ADD COLUMN IF NOT EXISTS po_cancelled_at TIMESTAMPTZ DEFAULT NULL, "
        "ADD COLUMN IF NOT EXISTS cancelled_po_number VARCHAR DEFAULT NULL;"
    )
    psql_cmd = f"PGPASSWORD='{db_pass}' psql -h {db_host} -p {db_port} -U {db_user} -d {db_name} -c \"{sql}\""
    rc = run_cmd(ssh, psql_cmd)
    if rc != 0:
        print("WARNING: Migration may have failed, continuing anyway...")

    print("\n=== Building API ===")
    rc = run_cmd(ssh, f"cd {REMOTE_API} && npx nest build 2>&1")
    if rc != 0:
        print("ERROR: API build failed")
        ssh.close()
        sys.exit(1)

    print("\n=== Restarting API ===")
    run_cmd(ssh, "pm2 restart vab-api 2>&1")
    run_cmd(ssh, "pm2 status 2>&1")

    ssh.close()
    print("\n=== Done! ===")

if __name__ == "__main__":
    main()
