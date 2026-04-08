import paramiko
import time
import os

HOST = '64.235.43.187'
USER = 'root'

# Files to upload: (local_path, remote_path)
API_FILES = [
    ('API/src/modules/tasks/entities/task.entity.ts',           '/var/www/html/enterprise/api/src/modules/tasks/entities/task.entity.ts'),
    ('API/src/modules/tasks/entities/task-comment.entity.ts',   '/var/www/html/enterprise/api/src/modules/tasks/entities/task-comment.entity.ts'),
    ('API/src/modules/tasks/entities/index.ts',                 '/var/www/html/enterprise/api/src/modules/tasks/entities/index.ts'),
    ('API/src/modules/tasks/dto/create-task.dto.ts',            '/var/www/html/enterprise/api/src/modules/tasks/dto/create-task.dto.ts'),
    ('API/src/modules/tasks/dto/update-task-status.dto.ts',     '/var/www/html/enterprise/api/src/modules/tasks/dto/update-task-status.dto.ts'),
    ('API/src/modules/tasks/dto/create-comment.dto.ts',         '/var/www/html/enterprise/api/src/modules/tasks/dto/create-comment.dto.ts'),
    ('API/src/modules/tasks/dto/index.ts',                      '/var/www/html/enterprise/api/src/modules/tasks/dto/index.ts'),
    ('API/src/modules/tasks/tasks.service.ts',                  '/var/www/html/enterprise/api/src/modules/tasks/tasks.service.ts'),
    ('API/src/modules/tasks/tasks.controller.ts',               '/var/www/html/enterprise/api/src/modules/tasks/tasks.controller.ts'),
    ('API/src/modules/tasks/tasks.module.ts',                   '/var/www/html/enterprise/api/src/modules/tasks/tasks.module.ts'),
    ('API/src/common/constants/permissions.ts',                 '/var/www/html/enterprise/api/src/common/constants/permissions.ts'),
    ('API/src/modules/enterprises/entities/enterprise.entity.ts', '/var/www/html/enterprise/api/src/modules/enterprises/entities/enterprise.entity.ts'),
    ('API/src/modules/super-admin/super-admin.service.ts',      '/var/www/html/enterprise/api/src/modules/super-admin/super-admin.service.ts'),
    ('API/src/modules/super-admin/super-admin.controller.ts',   '/var/www/html/enterprise/api/src/modules/super-admin/super-admin.controller.ts'),
    ('API/src/app.module.ts',                                   '/var/www/html/enterprise/api/src/app.module.ts'),
]

FRONTEND_FILES = [
    ('Frontend/src/types/tasks.ts',                                         '/var/www/html/enterprise/frontend/src/types/tasks.ts'),
    ('Frontend/src/lib/api/tasks.ts',                                       '/var/www/html/enterprise/frontend/src/lib/api/tasks.ts'),
    ('Frontend/src/lib/api/super-admin.ts',                                 '/var/www/html/enterprise/frontend/src/lib/api/super-admin.ts'),
    ('Frontend/src/stores/authStore.ts',                                    '/var/www/html/enterprise/frontend/src/stores/authStore.ts'),
    ('Frontend/src/components/layout/Sidebar.tsx',                          '/var/www/html/enterprise/frontend/src/components/layout/Sidebar.tsx'),
    ('Frontend/src/components/tasks/TaskStatusBadge.tsx',                   '/var/www/html/enterprise/frontend/src/components/tasks/TaskStatusBadge.tsx'),
    ('Frontend/src/components/tasks/TaskPriorityBadge.tsx',                 '/var/www/html/enterprise/frontend/src/components/tasks/TaskPriorityBadge.tsx'),
    ('Frontend/src/components/tasks/TaskKpiBar.tsx',                        '/var/www/html/enterprise/frontend/src/components/tasks/TaskKpiBar.tsx'),
    ('Frontend/src/components/tasks/TaskFilters.tsx',                       '/var/www/html/enterprise/frontend/src/components/tasks/TaskFilters.tsx'),
    ('Frontend/src/components/tasks/TaskTable.tsx',                         '/var/www/html/enterprise/frontend/src/components/tasks/TaskTable.tsx'),
    ('Frontend/src/components/tasks/TaskForm.tsx',                          '/var/www/html/enterprise/frontend/src/components/tasks/TaskForm.tsx'),
    ('Frontend/src/components/tasks/TaskComments.tsx',                      '/var/www/html/enterprise/frontend/src/components/tasks/TaskComments.tsx'),
    ('Frontend/src/app/(dashboard)/tasks/page.tsx',                         '/var/www/html/enterprise/frontend/src/app/(dashboard)/tasks/page.tsx'),
    ('Frontend/src/app/(dashboard)/tasks/add/page.tsx',                     '/var/www/html/enterprise/frontend/src/app/(dashboard)/tasks/add/page.tsx'),
    ('Frontend/src/app/(dashboard)/tasks/[id]/page.tsx',                    '/var/www/html/enterprise/frontend/src/app/(dashboard)/tasks/[id]/page.tsx'),
    ('Frontend/src/app/(dashboard)/tasks/[id]/edit/page.tsx',               '/var/www/html/enterprise/frontend/src/app/(dashboard)/tasks/[id]/edit/page.tsx'),
    ('Frontend/src/app/superadmin/(panel)/enterprises/[id]/page.tsx',       '/var/www/html/enterprise/frontend/src/app/superadmin/(panel)/enterprises/[id]/page.tsx'),
]

DB_SQL = """
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  enterprise_id INTEGER NOT NULL,
  task_number VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT DEFAULT NULL,
  priority VARCHAR NOT NULL DEFAULT 'medium',
  status VARCHAR NOT NULL DEFAULT 'pending',
  due_date DATE DEFAULT NULL,
  assigned_to INTEGER DEFAULT NULL REFERENCES employees(id) ON DELETE SET NULL,
  assigned_by INTEGER DEFAULT NULL REFERENCES employees(id) ON DELETE SET NULL,
  created_by INTEGER DEFAULT NULL REFERENCES employees(id) ON DELETE SET NULL,
  module VARCHAR DEFAULT NULL,
  related_entity_type VARCHAR DEFAULT NULL,
  related_entity_id INTEGER DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id SERIAL PRIMARY KEY,
  enterprise_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE enterprises ADD COLUMN IF NOT EXISTS task_visibility_unrestricted BOOLEAN NOT NULL DEFAULT false;
"""

def run_cmd(ssh, cmd, timeout=120):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    rc = stdout.channel.recv_exit_status()
    return rc, out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting...")
    ssh.connect(HOST, username=USER)
    print("Connected.")

    sftp = ssh.open_sftp()

    # Create remote directories
    dirs_to_create = [
        '/var/www/html/enterprise/api/src/modules/tasks',
        '/var/www/html/enterprise/api/src/modules/tasks/entities',
        '/var/www/html/enterprise/api/src/modules/tasks/dto',
        '/var/www/html/enterprise/frontend/src/types',
        '/var/www/html/enterprise/frontend/src/lib/api',
        '/var/www/html/enterprise/frontend/src/components/tasks',
        '/var/www/html/enterprise/frontend/src/app/(dashboard)/tasks',
        '/var/www/html/enterprise/frontend/src/app/(dashboard)/tasks/add',
        '/var/www/html/enterprise/frontend/src/app/(dashboard)/tasks/[id]',
        '/var/www/html/enterprise/frontend/src/app/(dashboard)/tasks/[id]/edit',
    ]
    for d in dirs_to_create:
        rc, out, err = run_cmd(ssh, f'mkdir -p "{d}"')
        print(f"mkdir {d}: rc={rc}")

    # Upload API files
    print("\n--- Uploading API files ---")
    base = os.path.dirname(os.path.abspath(__file__))
    for local, remote in API_FILES:
        local_full = os.path.join(base, local)
        if not os.path.exists(local_full):
            print(f"  MISSING: {local_full}")
            continue
        sftp.put(local_full, remote)
        print(f"  Uploaded: {local} -> {remote}")

    # Upload Frontend files
    print("\n--- Uploading Frontend files ---")
    for local, remote in FRONTEND_FILES:
        local_full = os.path.join(base, local)
        if not os.path.exists(local_full):
            print(f"  MISSING: {local_full}")
            continue
        sftp.put(local_full, remote)
        print(f"  Uploaded: {local} -> {remote}")

    sftp.close()

    # Run DB migrations
    print("\n--- Running DB migrations ---")
    # Write SQL to a temp file on server
    rc, out, err = run_cmd(ssh, "cat > /tmp/tasks_migration.sql << 'SQLEOF'\n" + DB_SQL + "\nSQLEOF")
    print(f"Write SQL file: rc={rc} err={err}")
    rc, out, err = run_cmd(ssh, 'su -c "psql -U postgres -d enterprise_db -f /tmp/tasks_migration.sql" postgres 2>&1 || psql -U postgres -d enterprise_db -f /tmp/tasks_migration.sql 2>&1')
    print(f"DB migration: rc={rc}")
    print(out)
    if err:
        print("STDERR:", err)

    # Try common postgres connection methods
    if rc != 0:
        print("Trying alternative DB connection...")
        rc, out, err = run_cmd(ssh, 'PGPASSWORD=postgres psql -h localhost -U postgres -d enterprise_db -f /tmp/tasks_migration.sql 2>&1')
        print(f"DB migration (alt): rc={rc}\n{out}\n{err}")

    # Build API
    print("\n--- Building API ---")
    rc, out, err = run_cmd(ssh, 'cd /var/www/html/enterprise/api && npx nest build 2>&1', timeout=180)
    print(f"API build: rc={rc}")
    if out:
        print(out[-3000:])
    if err:
        print("STDERR:", err[-1000:])

    if rc == 0:
        print("\n--- Restarting vab-api ---")
        rc2, out2, err2 = run_cmd(ssh, 'pm2 restart vab-api 2>&1')
        print(f"PM2 restart: rc={rc2}\n{out2}")
    else:
        print("API build FAILED — skipping restart")

    # Start frontend build in background
    print("\n--- Starting frontend build in background ---")
    build_id = str(int(time.time()))
    done_file = f'/tmp/fe_{build_id}_done.txt'
    cmd = f'nohup bash -c "cd /var/www/html/enterprise/frontend && npm run build > /tmp/fe_{build_id}.log 2>&1 && echo done > {done_file} || echo fail > {done_file}" > /dev/null 2>&1 &'
    transport = ssh.get_transport()
    channel = transport.open_session()
    channel.exec_command(cmd)
    time.sleep(2)
    channel.close()
    print(f"Frontend build started. Poll: {done_file}")
    print(f"Monitor: ssh root@{HOST} tail -f /tmp/fe_{build_id}.log")
    print(f"Done file: {done_file}")

    # Poll for completion (up to 10 min)
    print("Waiting for frontend build (up to 10 min)...")
    for i in range(60):
        time.sleep(10)
        rc_check, out_check, _ = run_cmd(ssh, f'cat {done_file} 2>/dev/null || echo waiting')
        status = out_check.strip()
        print(f"  [{i*10+10}s] {status}")
        if status in ('done', 'fail'):
            break

    if status == 'done':
        print("\n--- Restarting vab-frontend ---")
        rc3, out3, err3 = run_cmd(ssh, 'pm2 restart vab-frontend 2>&1')
        print(f"PM2 frontend restart: rc={rc3}\n{out3}")
    elif status == 'fail':
        print("Frontend build FAILED. Check logs:")
        rc_log, log_out, _ = run_cmd(ssh, f'tail -50 /tmp/fe_{build_id}.log')
        print(log_out)
    else:
        print("Frontend build still running — restart manually after build completes.")

    ssh.close()
    print("\nDeploy script complete.")

if __name__ == '__main__':
    main()
