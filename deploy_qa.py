#!/usr/bin/env python3
"""Deploy script for QA: sync API + Frontend to QA server, build, restart PM2."""

import os
import sys
import stat
import paramiko
from pathlib import Path

HOST = os.getenv("DEPLOY_HOST", "64.235.43.187")
PORT = int(os.getenv("DEPLOY_PORT", "22"))
USER = os.getenv("DEPLOY_USER", "root")
PASSWORD = os.getenv("DEPLOY_PASSWORD", "6BH07w0xB48?~kW-F")

# SMTP credentials — set these in GitHub Secrets (same keys as API .env.example)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = os.getenv("SMTP_PORT", "587")
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")

REMOTE_API = "/var/www/html/enterprise-qa/API"
REMOTE_FE  = "/var/www/html/enterprise-qa/Frontend"

LOCAL_API = Path(__file__).parent / "API"
LOCAL_FE  = Path(__file__).parent / "Frontend"

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

def update_env_smtp(ssh: paramiko.SSHClient, remote_env_path: str):
    """Read existing .env on server, patch SMTP lines, write back."""
    sftp = ssh.open_sftp()

    # Read existing .env (tolerate missing file)
    try:
        with sftp.open(remote_env_path, "r") as f:
            lines = f.read().decode().splitlines()
    except FileNotFoundError:
        lines = []

    smtp_keys = {"SMTP_HOST": SMTP_HOST, "SMTP_PORT": SMTP_PORT,
                 "SMTP_USER": SMTP_USER, "SMTP_PASS": SMTP_PASS, "SMTP_FROM": SMTP_FROM}
    updated = set()
    new_lines = []
    for line in lines:
        key = line.split("=", 1)[0].strip()
        if key in smtp_keys:
            new_lines.append(f"{key}={smtp_keys[key]}")
            updated.add(key)
        else:
            new_lines.append(line)

    # Append any SMTP keys not already present
    for key, val in smtp_keys.items():
        if key not in updated:
            new_lines.append(f"{key}={val}")

    with sftp.open(remote_env_path, "w") as f:
        f.write("\n".join(new_lines) + "\n")

    sftp.close()
    print(f"  .env updated with SMTP config at {remote_env_path}")


def main():
    print("=== QA Environment Deployment ===")
    print("Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
        print("Connected!")
    except Exception as e:
        print(f"ERROR: Could not connect to server: {e}")
        sys.exit(1)

    sftp = ssh.open_sftp()

    print("\n=== Uploading QA API source files ===")
    upload_dir(sftp, LOCAL_API, REMOTE_API)

    print("\n=== Uploading QA Frontend source files ===")
    upload_dir(sftp, LOCAL_FE, REMOTE_FE)

    sftp.close()

    print("\n=== Writing SMTP config to QA .env ===")
    update_env_smtp(ssh, f"{REMOTE_API}/.env")

    print("\n=== Files uploaded. Building on QA server... ===")

    # Install API dependencies and build
    run_cmd(ssh, f"cd {REMOTE_API} && npm install --legacy-peer-deps 2>&1 | tail -5")
    rc = run_cmd(ssh, f"cd {REMOTE_API} && npx nest build 2>&1")
    if rc != 0:
        print("ERROR: QA API build failed")
        ssh.close()
        sys.exit(1)

    # Install Frontend dependencies and build
    run_cmd(ssh, f"cd {REMOTE_FE} && npm install --legacy-peer-deps 2>&1 | tail -5")
    rc = run_cmd(ssh, f"cd {REMOTE_FE} && npm run build 2>&1 | tail -20")
    if rc != 0:
        print("ERROR: QA Frontend build failed")
        ssh.close()
        sys.exit(1)

    # Restart PM2
    print("\n=== Restarting PM2 processes (QA) ===")
    run_cmd(ssh, "pm2 restart vab-api-qa vab-frontend-qa 2>&1")
    run_cmd(ssh, "pm2 status 2>&1")

    ssh.close()
    print("\n=== QA Deployment complete! ===")
    print("QA Frontend: https://qa.vaberp.com")
    print("QA API: https://api.qa.vaberp.com")

if __name__ == "__main__":
    main()
