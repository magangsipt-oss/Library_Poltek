\set ON_ERROR_STOP on

SELECT 'CREATE DATABASE db_perpustakaan_poltek'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'db_perpustakaan_poltek'
)\gexec

\connect db_perpustakaan_poltek
\ir db_perpustakaan.sql