-- Run this once in your Supabase SQL Editor to fix the
-- "clients can list all files" security advisor warning.

drop policy if exists "Public read doodle images" on storage.objects;
