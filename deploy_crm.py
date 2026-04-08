#!/usr/bin/env python3
"""Deploy CRM module: run DB migration, upload API + Frontend files, build and restart."""

import sys
import paramiko
from pathlib import Path

HOST = "64.235.43.187"
PORT = 22
USER = "root"
PASSWORD = "6BH07w0xB48?~kW-F"

REMOTE_API      = "/var/www/html/enterprise/api"
REMOTE_FRONTEND = "/var/www/html/enterprise/frontend"
LOCAL_API       = Path("C:/Users/UNITECH2/Desktop/enterprise/API")
LOCAL_FRONTEND  = Path("C:/Users/UNITECH2/Desktop/enterprise/Frontend")

API_FILES = [
    # Modified existing files
    "src/app.module.ts",
    "src/common/constants/permissions.ts",
    "src/modules/employees/entities/employee.entity.ts",
    # Migration
    "src/database/migrations/1742400000000-AddCrmModule.ts",
    # CRM entities
    "src/modules/crm/entities/crm-lead.entity.ts",
    "src/modules/crm/entities/crm-followup.entity.ts",
    "src/modules/crm/entities/crm-activity-log.entity.ts",
    "src/modules/crm/entities/index.ts",
    # CRM DTOs
    "src/modules/crm/dto/create-lead.dto.ts",
    "src/modules/crm/dto/update-lead.dto.ts",
    "src/modules/crm/dto/update-lead-status.dto.ts",
    "src/modules/crm/dto/assign-lead.dto.ts",
    "src/modules/crm/dto/create-followup.dto.ts",
    "src/modules/crm/dto/index.ts",
    # CRM services + controller + module
    "src/modules/crm/crm-leads.service.ts",
    "src/modules/crm/crm-assignments.service.ts",
    "src/modules/crm/crm-followups.service.ts",
    "src/modules/crm/crm-reports.service.ts",
    "src/modules/crm/crm.controller.ts",
    "src/modules/crm/crm.module.ts",
]

FRONTEND_FILES = [
    # Modified existing files
    "src/stores/authStore.ts",
    "src/components/layout/Sidebar.tsx",
    # New types + API client
    "src/types/crm.ts",
    "src/lib/api/crm.ts",
    # CRM components
    "src/components/crm/LeadStatusBadge.tsx",
    "src/components/crm/LeadKpiBar.tsx",
    "src/components/crm/LeadFilters.tsx",
    "src/components/crm/LeadTable.tsx",
    "src/components/crm/AssignLeadModal.tsx",
    "src/components/crm/FollowupForm.tsx",
    "src/components/crm/FollowupTimeline.tsx",
    "src/components/crm/ActivityLog.tsx",
    "src/components/crm/LeadForm.tsx",
    "src/components/crm/PerformanceCard.tsx",
    # CRM pages
    "src/app/(dashboard)/crm/page.tsx",
    "src/app/(dashboard)/crm/add/page.tsx",
    "src/app/(dashboard)/crm/[id]/page.tsx",
    "src/app/(dashboard)/crm/[id]/edit/page.tsx",
    "src/app/(dashboard)/crm/follow-ups/page.tsx",
    "src/app/(dashboard)/crm/reports/page.tsx",
    "src/app/(dashboard)/crm/team/page.tsx",
]

def run_cmd(ssh, cmd, ignore_error=False):
    print(f"\n$ {cmd[:120]}{'...' if len(cmd) > 120 else ''}")
    _, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    for line in stdout:
        try:
            print(line, end="")
        except UnicodeEncodeError:
            print(line.encode('ascii', errors='replace').decode('ascii'), end="")
    rc = stdout.channel.recv_exit_status()
    if rc != 0 and not ignore_error:
        err = stderr.read().decode(errors='replace')
        if err:
            print(f"STDERR: {err}")
    return rc

def ensure_remote_dir(sftp, remote_path):
    """Create remote directory if it doesn't exist."""
    parts = remote_path.split('/')
    current = ''
    for part in parts:
        if not part:
            current = '/'
            continue
        current = f"{current}/{part}" if current != '/' else f"/{part}"
        try:
            sftp.stat(current)
        except FileNotFoundError:
            try:
                sftp.mkdir(current)
            except Exception:
                pass

def main():
    print("Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
    print("Connected!")

    sftp = ssh.open_sftp()

    # ── Upload API files ─────────────────────────────────────────────────────
    print("\n=== Uploading API files ===")
    for rel_path in API_FILES:
        local_path = LOCAL_API / rel_path
        remote_path = f"{REMOTE_API}/{rel_path}"
        remote_dir = '/'.join(remote_path.split('/')[:-1])
        ensure_remote_dir(sftp, remote_dir)
        if local_path.exists():
            sftp.put(str(local_path), remote_path)
            print(f"  uploaded: {rel_path}")
        else:
            print(f"  MISSING locally: {rel_path}")

    # ── Upload Frontend files ────────────────────────────────────────────────
    print("\n=== Uploading Frontend files ===")
    for rel_path in FRONTEND_FILES:
        local_path = LOCAL_FRONTEND / rel_path
        remote_path = f"{REMOTE_FRONTEND}/{rel_path}"
        remote_dir = '/'.join(remote_path.split('/')[:-1])
        ensure_remote_dir(sftp, remote_dir)
        if local_path.exists():
            sftp.put(str(local_path), remote_path)
            print(f"  uploaded: {rel_path}")
        else:
            print(f"  MISSING locally: {rel_path}")

    sftp.close()

    # ── Read DB config ────────────────────────────────────────────────────────
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

    # ── Run DB migration via psql ─────────────────────────────────────────────
    print("\n=== Running CRM DB migration ===")

    sql_statements = [
        # reporting_to on employees
        'ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "reporting_to" INTEGER DEFAULT NULL REFERENCES "employees"("id") ON DELETE SET NULL',

        # crm_leads table
        '''CREATE TABLE IF NOT EXISTS "crm_leads" (
  "id"                    SERIAL PRIMARY KEY,
  "enterprise_id"         INTEGER NOT NULL,
  "customer_id"           INTEGER DEFAULT NULL,
  "lead_number"           VARCHAR NOT NULL,
  "customer_name"         VARCHAR NOT NULL,
  "email"                 VARCHAR DEFAULT NULL,
  "mobile"                VARCHAR DEFAULT NULL,
  "business_name"         VARCHAR DEFAULT NULL,
  "gst_number"            VARCHAR DEFAULT NULL,
  "address"               VARCHAR DEFAULT NULL,
  "city"                  VARCHAR DEFAULT NULL,
  "state"                 VARCHAR DEFAULT NULL,
  "country"               VARCHAR DEFAULT NULL,
  "pincode"               VARCHAR DEFAULT NULL,
  "source"                VARCHAR DEFAULT NULL,
  "status"                VARCHAR NOT NULL DEFAULT 'new',
  "expected_value"        DECIMAL(12,2) DEFAULT NULL,
  "requirements"          TEXT DEFAULT NULL,
  "remarks"               TEXT DEFAULT NULL,
  "next_followup_date"    DATE DEFAULT NULL,
  "created_by"            INTEGER DEFAULT NULL,
  "assigned_to"           INTEGER DEFAULT NULL,
  "assigned_by"           INTEGER DEFAULT NULL,
  "manager_id"            INTEGER DEFAULT NULL,
  "converted_customer_id" INTEGER DEFAULT NULL,
  "created_date"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "modified_date"         TIMESTAMPTZ NOT NULL DEFAULT now()
)''',

        # crm_followups table
        '''CREATE TABLE IF NOT EXISTS "crm_followups" (
  "id"                 SERIAL PRIMARY KEY,
  "enterprise_id"      INTEGER NOT NULL,
  "crm_lead_id"        INTEGER NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
  "created_by"         INTEGER NOT NULL,
  "followup_type"      VARCHAR NOT NULL DEFAULT 'Call',
  "followup_date"      TIMESTAMP NOT NULL,
  "status"             VARCHAR DEFAULT NULL,
  "notes"              TEXT DEFAULT NULL,
  "next_followup_date" DATE DEFAULT NULL,
  "next_followup_type" VARCHAR DEFAULT NULL,
  "created_date"       TIMESTAMPTZ NOT NULL DEFAULT now()
)''',

        # crm_activity_logs table
        '''CREATE TABLE IF NOT EXISTS "crm_activity_logs" (
  "id"            SERIAL PRIMARY KEY,
  "enterprise_id" INTEGER NOT NULL,
  "crm_lead_id"   INTEGER NOT NULL REFERENCES "crm_leads"("id") ON DELETE CASCADE,
  "performed_by"  INTEGER NOT NULL,
  "action"        VARCHAR NOT NULL,
  "old_value"     JSONB DEFAULT NULL,
  "new_value"     JSONB DEFAULT NULL,
  "description"   TEXT DEFAULT NULL,
  "created_date"  TIMESTAMPTZ NOT NULL DEFAULT now()
)''',
    ]

    for sql in sql_statements:
        # Escape single quotes in SQL for shell, use $$ dollar-quoting via heredoc approach
        psql_cmd = f"PGPASSWORD='{db_pass}' psql -h {db_host} -p {db_port} -U {db_user} -d {db_name} -c \"{sql.replace(chr(10), ' ')}\""
        rc = run_cmd(ssh, psql_cmd, ignore_error=True)
        if rc != 0:
            print("  WARNING: statement may have failed (IF NOT EXISTS may be fine)")

    # ── Build API ─────────────────────────────────────────────────────────────
    print("\n=== Building API ===")
    rc = run_cmd(ssh, f"cd {REMOTE_API} && npx nest build 2>&1")
    if rc != 0:
        print("ERROR: API build failed!")
        ssh.close()
        sys.exit(1)

    # ── Build Frontend ────────────────────────────────────────────────────────
    print("\n=== Building Frontend ===")
    rc = run_cmd(ssh, f"cd {REMOTE_FRONTEND} && npm run build 2>&1", ignore_error=True)
    if rc != 0:
        print("WARNING: Frontend build had errors, check output above")

    # ── Restart PM2 ───────────────────────────────────────────────────────────
    print("\n=== Restarting PM2 processes ===")
    run_cmd(ssh, "pm2 restart vab-api 2>&1")
    run_cmd(ssh, "pm2 restart vab-frontend 2>&1")
    run_cmd(ssh, "pm2 status 2>&1")

    ssh.close()
    print("\n=== CRM Deploy Complete! ===")
    print(f"\nApp: http://{HOST}:2262")

if __name__ == "__main__":
    main()
