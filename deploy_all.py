#!/usr/bin/env python3
"""Deploy all changed files (git diff HEAD + new files) to VAB Enterprise server."""
import os, sys, subprocess, paramiko

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'
LOCAL_BASE = r'C:\Users\UNITECH2\Desktop\enterprise'
REMOTE_BASE = '/var/www/html/enterprise'
DIR_MAP = [('API/', 'api/'), ('Frontend/', 'frontend/')]

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def get_changed_files():
    r1 = subprocess.run(['git', 'diff', '--name-only', 'HEAD'], capture_output=True, text=True, cwd=LOCAL_BASE)
    files = [f.strip() for f in r1.stdout.splitlines() if f.strip()]
    r2 = subprocess.run(['git', 'status', '--short'], capture_output=True, text=True, cwd=LOCAL_BASE)
    for line in r2.stdout.splitlines():
        status = line[:2].strip()
        fname = line[3:].strip()
        if status in ('A', '??') and fname not in files:
            files.append(fname)
    return files

def remote_path(local_rel):
    for lp, rp in DIR_MAP:
        if local_rel.startswith(lp):
            return REMOTE_BASE + '/' + rp + local_rel[len(lp):]
    return None

def ensure_remote_dir(sftp, rpath):
    parts = rpath.split('/')
    path = ''
    for part in parts[:-1]:
        if not part: path = '/'; continue
        path = path.rstrip('/') + '/' + part
        try: sftp.stat(path)
        except FileNotFoundError: sftp.mkdir(path)

def run_remote(client, cmd, desc, timeout=600):
    print(f"\n>>> {desc}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    for line in (out + err).splitlines():
        print('   ', line.encode('ascii', errors='replace').decode('ascii'))
    rc = stdout.channel.recv_exit_status()
    print(f"    Exit: {rc}")
    return rc

def main():
    print(f"Connecting to {HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("Connected.")

    sftp = client.open_sftp()
    files = get_changed_files()
    deployable = [f for f in files if any(f.startswith(p) for p, _ in DIR_MAP)]

    print(f"\nUploading {len(deployable)} files...")
    ok = err_count = 0
    for rel in deployable:
        rpath = remote_path(rel)
        local_full = os.path.join(LOCAL_BASE, rel.replace('/', os.sep))
        if not os.path.isfile(local_full):
            print(f"  SKIP: {rel}")
            continue
        try:
            ensure_remote_dir(sftp, rpath)
            sftp.put(local_full, rpath)
            print(f"  OK: {rel}")
            ok += 1
        except Exception as e:
            print(f"  ERR: {rel} -> {e}")
            err_count += 1
    sftp.close()
    print(f"\nUploaded: {ok}, Errors: {err_count}")

    run_remote(client, 'cd /var/www/html/enterprise/api && npx nest build 2>&1', 'Building API...')
    run_remote(client, 'pm2 restart vab-api 2>&1 | cat', 'Restarting vab-api...')
    run_remote(client, 'cd /var/www/html/enterprise/frontend && npm run build 2>&1', 'Building Frontend...', timeout=600)
    run_remote(client, 'pm2 restart vab-frontend 2>&1 | cat', 'Restarting vab-frontend...')
    run_remote(client, 'pm2 list 2>&1 | cat', 'PM2 status')

    client.close()
    print("\nDeploy complete!")

if __name__ == '__main__':
    main()
