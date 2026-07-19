-- One-time migration: adds a password_hash column to profiles for the
-- "pick your name + enter your password" login screen.
-- Run once in the SQL Editor. Safe to re-run (IF NOT EXISTS).

alter table profiles add column if not exists password_hash text;
