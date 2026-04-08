#!/usr/bin/env python3
"""Deploy script: sync API + Frontend to server, build, restart PM2."""

import os
import sys
import stat
import paramiko
from pathlib import Path

HOST = "64.235.43.187"
PORT = 22
USER = "root"
PASSWORD = "6BH07w0xB48?~kW-F"
PASSWORD2 = "6BH07w0xB48?~kW-F"

REMOTE_API = "/var/www/html/enterprise/api"
REMOTE_FE  = "/var/www/html/enterprise/frontend"

LOCAL_API = Path("C:/Users/UNITECH2/Desktop/enterprise/API")
LOCAL_FE  = Path("C:/Users/UNITECH2/Desktop/enterprise/Frontend")

EXCLUDE = {
    "node_modules", ".git", ".next", "dist", ".angular",
    "__pycache__", ".DS_Store", "*.zip",
}

def should_exclude(name: str) -> bool:
    if name in EXCLUDE:
        return True
    for pat in EXCLUDE:
        if pat.startswith("*") and name.endswith(pat[1:]):
            return True
    return False

def upload_dir(sftp: paramiko.SFTPClient, local_dir: Path, remote_dir: str):
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)

    for item in local_dir.iterdir():
        if should_exclude(item.name):
            continue
        remote_path = f"{remote_dir}/{item.name}"
        if item.is_dir():
            upload_dir(sftp, item, remote_path)
        else:
            sftp.put(str(item), remote_path)
            print(f"  uploaded: {remote_path}")

def run_cmd(ssh: paramiko.SSHClient, cmd: str):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    for line in stdout:
        print(line.encode('utf-8', errors='replace').decode('utf-8', errors='replace'), end="")
    exit_code = stdout.channel.recv_exit_status()
    if exit_code != 0:
        err = stderr.read().decode()
        if err:
            print(f"STDERR: {err}")
    return exit_code

def main():
    print("Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    connected = False
    for pwd in [PASSWORD, PASSWORD2]:
        try:
            ssh.connect(HOST, port=PORT, username=USER, password=pwd, timeout=30)
            connected = True
            print("Connected!")
            break
        except Exception as e:
            print(f"Auth failed with one password: {e}")

    if not connected:
        print("ERROR: Could not connect to server")
        sys.exit(1)

    sftp = ssh.open_sftp()

    print("\n=== Uploading API source files ===")
    upload_dir(sftp, LOCAL_API, REMOTE_API)

    print("\n=== Uploading Frontend source files ===")
    upload_dir(sftp, LOCAL_FE, REMOTE_FE)

    sftp.close()
    print("\n=== Files uploaded. Building on server... ===")

    # Install API dependencies and build
    run_cmd(ssh, f"cd {REMOTE_API} && npm install --legacy-peer-deps 2>&1 | tail -5")
    rc = run_cmd(ssh, f"cd {REMOTE_API} && npx nest build 2>&1")
    if rc != 0:
        print("ERROR: API build failed")
        ssh.close()
        sys.exit(1)

    # Install Frontend dependencies and build
    run_cmd(ssh, f"cd {REMOTE_FE} && npm install --legacy-peer-deps 2>&1 | tail -5")
    rc = run_cmd(ssh, f"cd {REMOTE_FE} && npm run build 2>&1 | tail -20")
    if rc != 0:
        print("ERROR: Frontend build failed")
        ssh.close()
        sys.exit(1)

    # Restart PM2
    print("\n=== Restarting PM2 processes ===")
    run_cmd(ssh, "pm2 restart vab-api vab-frontend 2>&1")
    run_cmd(ssh, "pm2 status 2>&1")

    ssh.close()
    print("\n=== Deployment complete! ===")

if __name__ == "__main__":
    main()
