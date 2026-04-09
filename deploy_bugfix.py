import paramiko, tarfile, io, os, time

HOST = '64.235.43.187'
USER = 'root'
PASS = '6BH07w0xB48?~kW-F'
LOCAL = r'C:\Users\UNITECH2\Desktop\enterprise'

def ssh_run(client, cmd, timeout=300):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace').strip()
    err = stderr.read().decode(errors='replace').strip()
    return out, err

def make_tar(files_map):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tar:
        for local_path, arc_name in files_map.items():
            tar.add(local_path, arcname=arc_name)
    buf.seek(0)
    return buf

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

# ── Upload changed API files ──────────────────────────────────────────────────
print("Uploading API files...")
api_files = {
    os.path.join(LOCAL, 'API', 'src', 'modules', 'purchase-orders', 'purchase-orders.service.ts'):
        'api/src/modules/purchase-orders/purchase-orders.service.ts',
    os.path.join(LOCAL, 'API', 'src', 'modules', 'purchase-orders', 'purchase-orders.controller.ts'):
        'api/src/modules/purchase-orders/purchase-orders.controller.ts',
    os.path.join(LOCAL, 'API', 'src', 'modules', 'quotations', 'quotations.service.ts'):
        'api/src/modules/quotations/quotations.service.ts',
    os.path.join(LOCAL, 'API', 'src', 'modules', 'quotations', 'quotations.controller.ts'):
        'api/src/modules/quotations/quotations.controller.ts',
}
api_tar = make_tar(api_files)
sftp.putfo(api_tar, '/tmp/bugfix_api.tar.gz')
print("  API tar uploaded.")

# ── Upload changed Frontend files ─────────────────────────────────────────────
print("Uploading Frontend files...")
fe_files = {
    os.path.join(LOCAL, 'Frontend', 'src', 'components', 'quotations', 'QuotationBuilder.tsx'):
        'frontend/src/components/quotations/QuotationBuilder.tsx',
}
fe_tar = make_tar(fe_files)
sftp.putfo(fe_tar, '/tmp/bugfix_fe.tar.gz')
print("  Frontend tar uploaded.")

sftp.close()

# ── Extract and place files ───────────────────────────────────────────────────
print("Extracting files on server...")
out, err = ssh_run(client,
    'cd /var/www/html/enterprise && tar -xzf /tmp/bugfix_api.tar.gz && tar -xzf /tmp/bugfix_fe.tar.gz'
)
if err: print("Extract err:", err)

# ── Build API ─────────────────────────────────────────────────────────────────
print("Building API...")
out, err = ssh_run(client,
    'cd /var/www/html/enterprise/api && npx nest build 2>&1 | tail -5',
    timeout=180
)
print("  API build:", out[-300:] if out else "(no output)", err[-200:] if err else "")

# ── Restart API ───────────────────────────────────────────────────────────────
print("Restarting vab-api...")
out, err = ssh_run(client, 'pm2 restart vab-api 2>&1 | tr -cd "[:print:][:space:]"')
print(" ", out[-200:])

# ── Build Frontend ────────────────────────────────────────────────────────────
print("Building Frontend...")
out, err = ssh_run(client,
    'cd /var/www/html/enterprise/frontend && npm run build 2>&1 | tail -8',
    timeout=300
)
print("  FE build:", out[-400:] if out else "(no output)", err[-200:] if err else "")

# ── Restart Frontend ──────────────────────────────────────────────────────────
print("Restarting vab-frontend...")
out, err = ssh_run(client, 'pm2 restart vab-frontend 2>&1 | tr -cd "[:print:][:space:]"')
print(" ", out[-200:])

# ── Verify both running ───────────────────────────────────────────────────────
time.sleep(3)
out, _ = ssh_run(client, 'pm2 jlist 2>/dev/null | python3 -c "import sys,json; procs=json.load(sys.stdin); [print(p[\'name\'], p[\'pm2_env\'][\'status\']) for p in procs]"')
print("\nPM2 status:")
print(out)

client.close()
print("\nDone.")
