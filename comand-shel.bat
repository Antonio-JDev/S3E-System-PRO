set -euo pipefail


SRC="/mnt/S3E_SERVER/Apps/s3e-aplicacao/backups/backup_s3e_producao_20260805_153740.sql"


DEST_DIR="/mnt/S3E_SERVER/S3Eengenharia/05 - T.I. DEV APPS - JUNIOR"

echo "=== Checando caminhos ==="
ls -la "$SRC"
ls -ld "$DEST_DIR"

echo "=== Copiando ==="
cp -v "$SRC" "$DEST_DIR/"
chmod 644 "$DEST_DIR/backup_s3e_producao_20260805_153740.sql"

echo "=== Pronto ==="
ls -lh "$DEST_DIR/backup_s3e_producao_20260805_153740.sql"
echo "No Windows: \\\\Truenas\\s3e_server\\S3Eengenharia\\05 - T.I. DEV APPS - JUNIOR"