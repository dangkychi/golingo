package domain

import (
	"time"

	"github.com/google/uuid"
)

type Difficulty string

const (
	DiffBeginner     Difficulty = "beginner"
	DiffIntermediate Difficulty = "intermediate"
	DiffAdvanced     Difficulty = "advanced"
)

type StoryStatus string

const (
	StatusOngoing   StoryStatus = "ongoing"
	StatusCompleted StoryStatus = "completed"
)

type Genre struct {
	ID   uint   `json:"id" gorm:"primaryKey;autoIncrement"`
	Name string `json:"name" gorm:"uniqueIndex;size:100;not null"`
	Slug string `json:"slug" gorm:"uniqueIndex;size:100;not null"`
}

type Story struct {
	ID          uuid.UUID   `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Title       string      `json:"title" gorm:"size:500;not null"`
	Slug        string      `json:"slug" gorm:"uniqueIndex;size:500;not null"`
	Description *string     `json:"description"`
	CoverURL    *string     `json:"cover_url"`
	Author      *string     `json:"author" gorm:"size:255"`
	Difficulty  Difficulty  `json:"difficulty" gorm:"size:20;default:'intermediate'"`
	Status      StoryStatus `json:"status" gorm:"size:20;default:'ongoing'"`
	CreatedBy   *uuid.UUID  `json:"created_by" gorm:"type:uuid"`
	GutenbergID *int        `json:"gutenberg_id" gorm:"uniqueIndex;default:null"`
	CreatedAt   time.Time   `json:"created_at" gorm:"not null;default:now()"`
	UpdatedAt   time.Time   `json:"updated_at" gorm:"not null;default:now()"`

	Genres  []Genre   `json:"genres" gorm:"many2many:story_genres;"`
	Creator *User     `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
	Chapters []Chapter `json:"chapters,omitempty" gorm:"foreignKey:StoryID"`
}

type Chapter struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	StoryID    uuid.UUID `json:"story_id" gorm:"type:uuid;not null"`
	ChapterNum int       `json:"chapter_num" gorm:"not null"`
	Title      *string   `json:"title" gorm:"size:500"`
	Content    string    `json:"content" gorm:"type:text;not null"`
	WordCount  int       `json:"word_count" gorm:"default:0"`
	CreatedAt  time.Time `json:"created_at" gorm:"not null;default:now()"`
	UpdatedAt  time.Time `json:"updated_at" gorm:"not null;default:now()"`

	Story Story `json:"-" gorm:"foreignKey:StoryID;constraint:OnDelete:CASCADE"`
}
