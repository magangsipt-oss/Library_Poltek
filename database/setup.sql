\set ON_ERROR_STOP on

SELECT 'CREATE DATABASE db_perpustakaan'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'db_perpustakaan'
)\gexec

\connect db_perpustakaan
\ir migrasi_bahasa_indonesia.sql
\ir db_perpustakaan.sql
\ir admin_modules.sql
