import paramiko, os

EXCLUDES = {'node_modules', '.git', '.angular', 'platforms', 'plugins', '.DS_Store', 'android', 'ios', '.next'}
EXCLUDE_EXT = {'.zip'}

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('64.235.43.187', port=22, username='root', password='6BH07w0xB48?~kW-F')
sftp = ssh.open_sftp()

local_base = r'C:\Users\UNITECH2\Desktop\enterprise'
remote_base = '/var/www/html/enterprise'

def ensure_remote_dir(path):
    try:
        sftp.stat(path)
    except FileNotFoundError:
        ensure_remote_dir(os.path.dirname(path))
        sftp.mkdir(path)

count = 0
skipped = 0

for root, dirs, files in os.walk(local_base):
    dirs[:] = [d for d in dirs if d not in EXCLUDES]

    rel_path = os.path.relpath(root, local_base).replace(os.sep, '/')
    remote_dir = remote_base + '/' + rel_path if rel_path != '.' else remote_base

    ensure_remote_dir(remote_dir)

    for f in files:
        ext = os.path.splitext(f)[1]
        if ext in EXCLUDE_EXT:
            skipped += 1
            continue
        local_file = os.path.join(root, f)
        remote_file = remote_dir + '/' + f

        try:
            local_size = os.path.getsize(local_file)
            try:
                remote_stat = sftp.stat(remote_file)
                local_mtime = os.path.getmtime(local_file)
                if abs(local_mtime - remote_stat.st_mtime) < 2 and local_size == remote_stat.st_size:
                    skipped += 1
                    continue
            except:
                pass

            sftp.put(local_file, remote_file)
            count += 1
            if count % 50 == 0:
                print(f'  Uploaded {count} files...')
        except Exception as e:
            print(f'  SKIP {f}: {e}')
            skipped += 1

print(f'\nDone! Uploaded: {count} files, Skipped: {skipped} files')
sftp.close()
ssh.close()
