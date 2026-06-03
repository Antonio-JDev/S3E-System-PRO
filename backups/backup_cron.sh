#!/bin/bash
# =============================================================================
# S3E System PRO — backup automático (PostgreSQL + volumes Docker)
#
# Uso manual (no servidor):
#   chmod +x backups/backup_cron.sh
#   ./backups/backup_cron.sh
#
# TrueNAS Scale → System Settings → Advanced → Cron Jobs → Add:
#   Description: Backup Automático Banco S3E
#   Command:     /mnt/S3E_SERVER/Apps/s3e-aplicacao/backups/backup_cron.sh
#   User:        root
#   Schedule:    0 3 * * *   (todo dia às 03:00)
#
# Variáveis opcionais (export antes de rodar ou no cron):
#   POSTGRES_CONTAINER=s3e-postgres-prod
#   ENV_FILE=/caminho/.env
#   RETENTION_DAYS=30
#   UPLOADS_VOLUME=apps_backend_uploads
#   CERTIFICADOS_VOLUME=apps_backend_certificados
#   BACKUP_VOLUMES=1          (0 para desativar tar de uploads/certificados)
# =============================================================================

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$SCRIPT_DIR"
LOG_FILE="$BACKUP_DIR/backup.log"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
CONTAINER="${POSTGRES_CONTAINER:-s3e-postgres-prod}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
BACKUP_VOLUMES="${BACKUP_VOLUMES:-1}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-apps_backend_uploads}"
CERTIFICADOS_VOLUME="${CERTIFICADOS_VOLUME:-apps_backend_certificados}"
TAR_IMAGE="${TAR_IMAGE:-alpine:3.20}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
MIN_BYTES=512

DB_USER="${DB_USER:-s3e_prod}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-s3e_producao}"

MAIN_OK=0
ERRORS=0

log() {
  local line="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$line"
  echo "$line" >>"$LOG_FILE"
}

read_env_value() {
  local key="$1"
  local file="$2"
  [[ -f "$file" ]] || return 1
  local line
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -1 || true)"
  [[ -n "$line" ]] || return 1
  line="${line#*=}"
  line="${line//$'\r'/}"
  line="${line#\"}"
  line="${line%\"}"
  line="${line#\'}"
  line="${line%\'}"
  printf '%s' "$line"
}

load_credentials() {
  if [[ -f "$ENV_FILE" ]]; then
    DB_USER="$(read_env_value DB_USER "$ENV_FILE" || echo "$DB_USER")"
    DB_PASSWORD="$(read_env_value DB_PASSWORD "$ENV_FILE" || echo "$DB_PASSWORD")"
    DB_NAME="$(read_env_value DB_NAME "$ENV_FILE" || echo "$DB_NAME")"
    log "Credenciais carregadas de $ENV_FILE (usuário=$DB_USER, banco principal=$DB_NAME)"
  else
    log "AVISO: $ENV_FILE não encontrado — usando padrões ($DB_USER / $DB_NAME)"
  fi
}

container_running() {
  docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true
}

database_exists() {
  local db="$1"
  docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER" \
    psql -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" 2>/dev/null \
    | grep -q 1
}

file_size() {
  local f="$1"
  if stat -c%s "$f" >/dev/null 2>&1; then
    stat -c%s "$f"
  else
    wc -c <"$f" | tr -d ' '
  fi
}

dump_database() {
  local db_name="$1"
  local file_tag="$2"
  local required="${3:-0}"
  local outfile="$BACKUP_DIR/backup_${file_tag}_${TIMESTAMP}.sql.gz"

  if ! database_exists "$db_name"; then
    if [[ "$required" == "1" ]]; then
      log "ERRO: banco obrigatório '$db_name' não existe no container $CONTAINER"
      return 1
    fi
    log "INFO: banco opcional '$db_name' não existe — ignorado"
    return 0
  fi

  log "Iniciando dump: $db_name → $(basename "$outfile")"

  if ! docker exec -e PGPASSWORD="$DB_PASSWORD" -i "$CONTAINER" \
    pg_dump -U "$DB_USER" -d "$db_name" --no-owner --no-acl 2>>"$LOG_FILE" \
    | gzip -9 >"$outfile"; then
    log "ERRO: pg_dump falhou para '$db_name'"
    rm -f "$outfile"
    return 1
  fi

  local size
  size="$(file_size "$outfile")"
  if [[ -z "$size" ]] || [[ "$size" -lt "$MIN_BYTES" ]]; then
    log "ERRO: arquivo de backup inválido ou vazio ($outfile, ${size:-0} bytes)"
    rm -f "$outfile"
    return 1
  fi

  log "OK: $(basename "$outfile") — ${size} bytes"
  return 0
}

volume_exists() {
  docker volume inspect "$1" >/dev/null 2>&1
}

backup_docker_volume() {
  local vol_name="$1"
  local file_tag="$2"
  local required="${3:-0}"
  local outfile="$BACKUP_DIR/backup_${file_tag}_${TIMESTAMP}.tar.gz"
  local mount_path="/volume_data"

  if ! volume_exists "$vol_name"; then
    if [[ "$required" == "1" ]]; then
      log "ERRO: volume Docker '$vol_name' não encontrado"
      return 1
    fi
    log "INFO: volume '$vol_name' não existe — ignorado"
    return 0
  fi

  log "Iniciando tar do volume: $vol_name → $(basename "$outfile")"

  if ! docker run --rm \
    -v "${vol_name}:${mount_path}:ro" \
    "$TAR_IMAGE" \
    tar -czf - -C "$mount_path" . 2>>"$LOG_FILE" >"$outfile"; then
    log "ERRO: tar falhou para volume '$vol_name'"
    rm -f "$outfile"
    return 1
  fi

  local size
  size="$(file_size "$outfile")"
  if [[ -z "$size" ]] || [[ "$size" -lt 20 ]]; then
    log "ERRO: arquivo tar inválido ($outfile, ${size:-0} bytes)"
    rm -f "$outfile"
    return 1
  fi

  log "OK: $(basename "$outfile") — ${size} bytes"
  return 0
}

purge_old_backups() {
  log "Removendo backups com mais de ${RETENTION_DAYS} dias em $BACKUP_DIR"
  find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'backup_*.sql.gz' -o -name 'backup_*.tar.gz' \) \
    -mtime +"$RETENTION_DAYS" -print -delete 2>>"$LOG_FILE" || true
}

main() {
  mkdir -p "$BACKUP_DIR"
  log "========== Início backup S3E ($TIMESTAMP) =========="
  log "Projeto: $PROJECT_DIR | Container: $CONTAINER"

  if ! command -v docker >/dev/null 2>&1; then
    log "ERRO: docker não encontrado no PATH"
    exit 1
  fi

  load_credentials

  if container_running; then
    if dump_database "$DB_NAME" "s3e_producao" 1; then
      MAIN_OK=1
    else
      ERRORS=$((ERRORS + 1))
    fi

    for optional_db in evogo_auth evogo_users evolution; do
      if ! dump_database "$optional_db" "$optional_db" 0; then
        ERRORS=$((ERRORS + 1))
        log "AVISO: falha no backup opcional de '$optional_db' (ERP principal não afetado)"
      fi
    done
  else
    log "ERRO: container '$CONTAINER' não está em execução — pulando dumps PostgreSQL"
    ERRORS=$((ERRORS + 1))
  fi

  if [[ "$BACKUP_VOLUMES" == "1" ]]; then
    if ! backup_docker_volume "$UPLOADS_VOLUME" "uploads" 0; then
      ERRORS=$((ERRORS + 1))
      log "AVISO: falha no backup do volume de uploads ($UPLOADS_VOLUME)"
    fi
    if ! backup_docker_volume "$CERTIFICADOS_VOLUME" "certificados" 0; then
      ERRORS=$((ERRORS + 1))
      log "AVISO: falha no backup do volume de certificados ($CERTIFICADOS_VOLUME)"
    fi
  else
    log "INFO: BACKUP_VOLUMES=0 — tar de volumes ignorado"
  fi

  purge_old_backups

  if [[ "$MAIN_OK" -eq 1 ]]; then
    log "========== Backup concluído (avisos/erros opcionais: $ERRORS) =========="
    exit 0
  fi

  if [[ "$BACKUP_VOLUMES" == "1" ]] && volume_exists "$UPLOADS_VOLUME"; then
    log "========== AVISO: banco principal falhou, mas volumes podem ter sido salvos =========="
    exit 2
  fi

  log "========== FALHA: backup principal não gerado =========="
  exit 1
}

main "$@"
