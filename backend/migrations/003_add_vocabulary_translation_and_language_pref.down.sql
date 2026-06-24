-- 003_add_vocabulary_translation_and_language_pref.down.sql
ALTER TABLE users DROP COLUMN IF EXISTS translate_target_lang;

ALTER TABLE user_vocabulary DROP CONSTRAINT IF EXISTS user_vocabulary_user_id_selected_text_key;
ALTER TABLE user_vocabulary DROP COLUMN IF EXISTS selected_text;
ALTER TABLE user_vocabulary DROP COLUMN IF EXISTS translation;

-- Restore the original unique constraint (requires resolving duplicates if any exist, but standard down mig)
ALTER TABLE user_vocabulary ADD CONSTRAINT user_vocabulary_user_id_word_key UNIQUE(user_id, word);
