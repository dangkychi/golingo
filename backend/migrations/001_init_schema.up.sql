-- 001_init_schema.up.sql
-- GOLingo Database Schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Users
-- ============================================
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    avatar_url    TEXT,
    role          VARCHAR(20) NOT NULL DEFAULT 'user',
    google_id     VARCHAR(255) UNIQUE,
    totp_secret   VARCHAR(255),
    totp_enabled  BOOLEAN NOT NULL DEFAULT false,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- Genres
-- ============================================
CREATE TABLE genres (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- Seed default genres
INSERT INTO genres (name, slug) VALUES
    ('Fiction', 'fiction'),
    ('Non-Fiction', 'non-fiction'),
    ('Science Fiction', 'science-fiction'),
    ('Fantasy', 'fantasy'),
    ('Mystery', 'mystery'),
    ('Romance', 'romance'),
    ('Horror', 'horror'),
    ('Adventure', 'adventure'),
    ('Biography', 'biography'),
    ('History', 'history'),
    ('Children', 'children'),
    ('Self-Help', 'self-help');

-- ============================================
-- Stories
-- ============================================
CREATE TABLE stories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(500) NOT NULL,
    slug        VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    cover_url   TEXT,
    author      VARCHAR(255),
    difficulty  VARCHAR(20) DEFAULT 'intermediate',
    status      VARCHAR(20) DEFAULT 'ongoing',
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stories_slug ON stories(slug);
CREATE INDEX idx_stories_difficulty ON stories(difficulty);
CREATE INDEX idx_stories_status ON stories(status);

-- ============================================
-- Story Genres (many-to-many)
-- ============================================
CREATE TABLE story_genres (
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    genre_id INT REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, genre_id)
);

-- ============================================
-- Chapters
-- ============================================
CREATE TABLE chapters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_num INT NOT NULL,
    title       VARCHAR(500),
    content     TEXT NOT NULL,
    word_count  INT DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(story_id, chapter_num)
);

CREATE INDEX idx_chapters_story ON chapters(story_id);

-- ============================================
-- Vocabulary Entries (system dictionary)
-- ============================================
CREATE TABLE vocabulary_entries (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word           VARCHAR(255) NOT NULL,
    phonetic       VARCHAR(255),
    definition     TEXT NOT NULL,
    example        TEXT,
    part_of_speech VARCHAR(50),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_vocab_word ON vocabulary_entries(LOWER(word));

-- ============================================
-- User Vocabulary (saved words + SM-2 data)
-- ============================================
CREATE TABLE user_vocabulary (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id         UUID REFERENCES vocabulary_entries(id),
    word             VARCHAR(255) NOT NULL,
    context_sentence TEXT,
    user_note        TEXT,
    chapter_id       UUID REFERENCES chapters(id),
    story_id         UUID REFERENCES stories(id),
    ease_factor      FLOAT NOT NULL DEFAULT 2.5,
    interval_days    INT NOT NULL DEFAULT 1,
    repetitions      INT NOT NULL DEFAULT 0,
    next_review_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, word)
);

CREATE INDEX idx_user_vocab_user ON user_vocabulary(user_id);
CREATE INDEX idx_user_vocab_review ON user_vocabulary(user_id, next_review_at);

-- ============================================
-- Flashcard Reviews
-- ============================================
CREATE TABLE flashcard_reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_vocab_id UUID NOT NULL REFERENCES user_vocabulary(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quality       INT NOT NULL CHECK (quality BETWEEN 0 AND 5),
    reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_user ON flashcard_reviews(user_id);
CREATE INDEX idx_reviews_date ON flashcard_reviews(user_id, reviewed_at);

-- ============================================
-- Reading Progress
-- ============================================
CREATE TABLE reading_progress (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, story_id)
);

CREATE INDEX idx_reading_user ON reading_progress(user_id);

-- ============================================
-- Refresh Tokens
-- ============================================
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
