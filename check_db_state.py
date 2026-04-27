#!/usr/bin/env python3
"""Quick diagnostic of the production DB migration state."""
import paramiko

HOST = '64.235.43.187'
USER = 'root'
PASSWORD = '6BH07w0xB48?~kW-F'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

def run(cmd, desc):
    print(f"\n>>> {desc}")
    _, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out + err)
    return stdout.channel.recv_exit_status()

# Check environment
run('cat /var/www/html/enterprise/api/.env | grep -E "^DB_" | sed "s/PASSWORD=.*/PASSWORD=***/"', 'DB env vars')

# Check migrations table
run(
    'cd /var/www/html/enterprise/api && source .env && '
    'PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" '
    '-c "SELECT * FROM migrations ORDER BY id;"',
    'Contents of migrations table',
)

# Check BOM-related tables exist
run(
    'cd /var/www/html/enterprise/api && source .env && '
    'PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" '
    "-c \"SELECT table_name FROM information_schema.tables WHERE table_schema='public' "
    "AND table_name IN ('product_boms','product_bom_items','bill_of_materials','bom_items','products','raw_materials') "
    'ORDER BY table_name;"',
    'BOM-related tables present',
)

# Check bill_of_materials columns
run(
    'cd /var/www/html/enterprise/api && source .env && '
    'PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" '
    "-c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='bill_of_materials' ORDER BY ordinal_position;\"",
    'bill_of_materials columns',
)

# Count rows in bill_of_materials (for idea of migration scope)
run(
    'cd /var/www/html/enterprise/api && source .env && '
    'PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" '
    '-c "SELECT COUNT(*) AS bom_rows, COUNT(DISTINCT (enterprise_id, product_id)) AS distinct_prod FROM bill_of_materials WHERE product_id IS NOT NULL;"',
    'bill_of_materials stats',
)

client.close()
