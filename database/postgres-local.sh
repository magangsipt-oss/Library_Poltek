#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
data_directory="$project_root/.local-postgres/data"
log_file="$project_root/.local-postgres/postgres.log"
postgres_bin="$(pg_config --bindir)"

if [[ ! -f "$data_directory/PG_VERSION" ]]; then
  printf '%s\n' 'Instance PostgreSQL lokal belum tersedia. Lihat panduan database di README.md.' >&2
  exit 1
fi

case "${1:-start}" in
  start)
    if "$postgres_bin/pg_ctl" -D "$data_directory" status >/dev/null 2>&1; then
      printf '%s\n' 'PostgreSQL lokal sudah berjalan.'
    else
      "$postgres_bin/pg_ctl" -D "$data_directory" -l "$log_file" -w start
    fi
    ;;
  stop)
    if "$postgres_bin/pg_ctl" -D "$data_directory" status >/dev/null 2>&1; then
      "$postgres_bin/pg_ctl" -D "$data_directory" -m fast -w stop
    else
      printf '%s\n' 'PostgreSQL lokal sudah berhenti.'
    fi
    ;;
  status)
    "$postgres_bin/pg_ctl" -D "$data_directory" status
    ;;
  *)
    printf '%s\n' 'Gunakan: postgres-local.sh start|stop|status' >&2
    exit 1
    ;;
esac
