-- 002_add_gutenberg_id.up.sql
ALTER TABLE stories ADD COLUMN gutenberg_id INT UNIQUE DEFAULT NULL;
