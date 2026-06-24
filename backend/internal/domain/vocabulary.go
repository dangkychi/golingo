package domain

import (
	"time"

	"github.com/google/uuid"
)

type VocabularyEntry struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Word         string    `json:"word" gorm:"size:255;not null"`
	Phonetic     *string   `json:"phonetic" gorm:"size:255"`
	Definition   string    `json:"definition" gorm:"type:text;not null"`
	Example      *string   `json:"example" gorm:"type:text"`
	PartOfSpeech *string   `json:"part_of_speech" gorm:"size:50"`
	CreatedAt    time.Time `json:"created_at" gorm:"not null;default:now()"`
}

type UserVocabulary struct {
	ID              uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID          uuid.UUID  `json:"user_id" gorm:"type:uuid;not null"`
	EntryID         *uuid.UUID `json:"entry_id" gorm:"type:uuid"`
	Word            string     `json:"word" gorm:"size:255;not null"`
	SelectedText    string     `json:"selected_text" gorm:"type:text;not null;default:''"`
	Translation     *string    `json:"translation" gorm:"type:text"`
	ContextSentence *string    `json:"context_sentence" gorm:"type:text"`
	UserNote        *string    `json:"user_note" gorm:"type:text"`
	ChapterID       *uuid.UUID `json:"chapter_id" gorm:"type:uuid"`
	StoryID         *uuid.UUID `json:"story_id" gorm:"type:uuid"`

	// SM-2 Spaced Repetition fields
	EaseFactor   float64   `json:"ease_factor" gorm:"not null;default:2.5"`
	IntervalDays int       `json:"interval_days" gorm:"not null;default:1"`
	Repetitions  int       `json:"repetitions" gorm:"not null;default:0"`
	NextReviewAt time.Time `json:"next_review_at" gorm:"not null;default:now()"`

	CreatedAt time.Time `json:"created_at" gorm:"not null;default:now()"`
	UpdatedAt time.Time `json:"updated_at" gorm:"not null;default:now()"`

	User    User             `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Entry   *VocabularyEntry `json:"entry,omitempty" gorm:"foreignKey:EntryID"`
	Chapter *Chapter         `json:"-" gorm:"foreignKey:ChapterID"`
	Story   *Story           `json:"-" gorm:"foreignKey:StoryID"`
}

func (UserVocabulary) TableName() string {
	return "user_vocabulary"
}

type FlashcardReview struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserVocabID uuid.UUID `json:"user_vocab_id" gorm:"type:uuid;not null"`
	UserID      uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	Quality     int       `json:"quality" gorm:"not null"` // 0-5 SM-2 quality
	ReviewedAt  time.Time `json:"reviewed_at" gorm:"not null;default:now()"`

	UserVocab UserVocabulary `json:"-" gorm:"foreignKey:UserVocabID;constraint:OnDelete:CASCADE"`
	User      User           `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

type ReadingProgress struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	StoryID   uuid.UUID `json:"story_id" gorm:"type:uuid;not null"`
	ChapterID uuid.UUID `json:"chapter_id" gorm:"type:uuid;not null"`
	UpdatedAt time.Time `json:"updated_at" gorm:"not null;default:now()"`

	User    User    `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Story   Story   `json:"-" gorm:"foreignKey:StoryID;constraint:OnDelete:CASCADE"`
	Chapter Chapter `json:"-" gorm:"foreignKey:ChapterID"`
}

func (ReadingProgress) TableName() string {
	return "reading_progress"
}
