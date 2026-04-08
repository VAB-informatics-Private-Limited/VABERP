#!/usr/bin/env python3
"""Deploy changed files to VAB Enterprise server using paramiko."""
import os
import sys
import paramiko
import subprocess

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'

# Map local dir prefix -> remote dir prefix
DIR_MAP = [
    ('API/', 'api/'),
    ('Frontend/', 'frontend/'),
]

def get_changed_files():
    result = subprocess.run(
        ['git', 'diff', '--name-only', 'HEAD'],
        capture_output=True, text=True, cwd=LOCAL_BASE
    )
    files = [f.strip() for f in result.stdout.splitlines() if f.strip()]
    # Also get untracked/new files (status A)
    result2 = subprocess.run(
        ['git', 'status', '--short'],
        capture_output=True, text=True, cwd=LOCAL_BASE
    )
    for line in result2.stdout.splitlines():
        if line.startswith('A ') or line.startswith(' A'):
            fname = line[2:].strip()
            if fname not in files:
                files.append(fname)
    return files

def remote_path(local_rel):
    for local_prefix, remote_prefix in DIR_MAP:
        if local_rel.startswith(local_prefix):
            return REMOTE_BASE + '/' + remote_prefix + local_rel[len(local_prefix):]
    return None

def ensure_remote_dir(sftp, remote_file_path):
    parts = remote_file_path.split('/')
    path = ''
    for part in parts[:-1]:
        if not part:
            path = '/'
            continue
        path = path.rstrip('/') + '/' + part
        try:
            sftp.stat(path)
        except FileNotFoundError:
            sftp.mkdir(path)

def main():
    print(f"Connecting to {HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("Connected.")

    sftp = client.open_sftp()

    files = get_changed_files()
    # Filter only API/ and Frontend/ files
    deployable = [f for f in files if any(f.startswith(p) for p, _ in DIR_MAP)]

    print(f"\nUploading {len(deployable)} files...")
    uploaded = 0
    skipped = 0
    for rel_path in deployable:
        rpath = remote_path(rel_path)
        if not rpath:
            skipped += 1
            continue
        local_full = os.path.join(LOCAL_BASE, rel_path.replace('/', os.sep))
        if not os.path.isfile(local_full):
            print(f"  SKIP (not file): {rel_path}")
            skipped += 1
            continue
        try:
            ensure_remote_dir(sftp, rpath)
            sftp.put(local_full, rpath)
            print(f"  OK: {rel_path} -> {rpath}")
            uploaded += 1
        except Exception as e:
            print(f"  ERROR: {rel_path}: {e}")

    sftp.close()
    print(f"\nUploaded: {uploaded}, Skipped: {skipped}")

    def run_remote(cmd, desc):
        print(f"\n>>> {desc}")
        print(f"    $ {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300, get_pty=True)
        for line in stdout:
            print('   ', line.rstrip())
        exit_code = stdout.channel.recv_exit_status()
        print(f"    Exit code: {exit_code}")
        return exit_code

    # Build and restart API
    rc = run_remote(
        'cd /var/www/html/enterprise/api && npx nest build 2>&1',
        'Building API (NestJS)...'
    )
    if rc != 0:
        print("WARNING: API build exited non-zero, check output above.")

    run_remote('pm2 restart vab-api', 'Restarting vab-api...')

    # Build and restart Frontend
    rc = run_remote(
        'cd /var/www/html/enterprise/frontend && npm run build 2>&1',
        'Building Frontend (Next.js)... (this may take a few minutes)'
    )
    if rc != 0:
        print("WARNING: Frontend build exited non-zero, check output above.")

    run_remote('pm2 restart vab-frontend', 'Restarting vab-frontend...')

    run_remote('pm2 list', 'PM2 process status')

    client.close()
    print("\nDeploy complete!")

if __name__ == '__main__':
    main()
