-- 003_add_vocabulary_translation_and_language_pref.up.sql
ALTER TABLE users ADD COLUMN translate_target_lang VARCHAR(10) NOT NULL DEFAULT 'vi';

-- Drop the old unique constraint on user_id and word
ALTER TABLE user_vocabulary DROP CONSTRAINT IF EXISTS user_vocabulary_user_id_word_key;

-- Add new columns
ALTER TABLE user_vocabulary ADD COLUMN selected_text TEXT NOT NULL DEFAULT '';
ALTER TABLE user_vocabulary ADD COLUMN translation TEXT;

-- Update existing records if any: copy word to selected_text
UPDATE user_vocabulary SET selected_text = word WHERE selected_text = '';

-- Add new constraint UNIQUE(user_id, selected_text)
ALTER TABLE user_vocabulary ADD CONSTRAINT user_vocabulary_user_id_selected_text_key UNIQUE(user_id, selected_text);
