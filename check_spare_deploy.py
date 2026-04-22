#!/usr/bin/env python3
"""Verify spare parts deployment: check tables exist, API is healthy, PM2 running."""
import paramiko

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

CHECKS = [
    ("Tables exist",
     "psql -h localhost -p 2263 -U postgres -d vab_enterprise -c "
     "\"\\dt spare_parts machine_spare_map machine_spares\" 2>&1"),
    ("spare_parts columns",
     "psql -h localhost -p 2263 -U postgres -d vab_enterprise -c "
     "\"\\d spare_parts\" 2>&1 | head -30"),
    ("API route registered",
     "pm2 logs vab-api --lines 30 --nostream 2>&1 | grep -i 'spare\\|SparePart\\|machinery' | head -15"),
    ("API health ping",
     "curl -s -o /dev/null -w 'HTTP %{http_code}\\n' http://localhost:2261/api/health "
     "|| curl -s -o /dev/null -w 'HTTP %{http_code}\\n' http://localhost:2261/health 2>&1"),
    ("PM2 uptime",
     "pm2 list 2>&1 | grep -E 'vab-api|vab-frontend' | cat"),
]

for label, cmd in CHECKS:
    print(f"\n=== {label} ===")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print((out + err).strip() or "(no output)")

client.close()
