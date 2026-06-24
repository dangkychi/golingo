package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/google/uuid"
)

type VocabularyService interface {
	AddWord(ctx context.Context, userID uuid.UUID, word, selectedText string, translation *string, contextSentence *string, userNote *string, chapterID *uuid.UUID, storyID *uuid.UUID) (*domain.UserVocabulary, error)
	UpdateVocabulary(ctx context.Context, id uuid.UUID, userID uuid.UUID, translation *string, userNote *string) (*domain.UserVocabulary, error)
	DeleteVocabulary(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	ListVocabulary(ctx context.Context, userID uuid.UUID, search string, storyID *uuid.UUID, page, pageSize int) ([]domain.UserVocabulary, int64, error)
}

type vocabularyService struct {
	vocabRepo repository.VocabularyRepository
}

func NewVocabularyService(vocabRepo repository.VocabularyRepository) VocabularyService {
	return &vocabularyService{vocabRepo: vocabRepo}
}

func (s *vocabularyService) AddWord(ctx context.Context, userID uuid.UUID, word, selectedText string, translation *string, contextSentence *string, userNote *string, chapterID *uuid.UUID, storyID *uuid.UUID) (*domain.UserVocabulary, error) {
	word = strings.TrimSpace(word)
	selectedText = strings.TrimSpace(selectedText)
	if selectedText == "" {
		selectedText = word
	}

	if word == "" {
		return nil, errors.New("word cannot be empty")
	}

	// Check if already saved
	existing, err := s.vocabRepo.GetBySelectedText(ctx, userID, selectedText)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing vocabulary: %w", err)
	}
	if existing != nil {
		return nil, errors.New("this selected text is already in your vocabulary")
	}

	// Find or create global vocabulary entry
	entry, err := s.vocabRepo.GetEntryByWord(ctx, word)
	if err != nil {
		return nil, fmt.Errorf("failed to find vocabulary entry: %w", err)
	}

	var entryID *uuid.UUID
	if entry == nil {
		// Create a basic entry
		newEntry := &domain.VocabularyEntry{
			ID:         uuid.New(),
			Word:       word,
			Definition: "User added word",
		}
		if err := s.vocabRepo.CreateEntry(ctx, newEntry); err != nil {
			// In case of concurrent creation, try to get it again
			entry, err = s.vocabRepo.GetEntryByWord(ctx, word)
			if err != nil || entry == nil {
				// Don't fail the whole request, we can save without entry_id
				entryID = nil
			} else {
				entryID = &entry.ID
			}
		} else {
			entryID = &newEntry.ID
		}
	} else {
		entryID = &entry.ID
	}

	// Create user vocabulary
	now := time.Now()
	userVocab := &domain.UserVocabulary{
		ID:              uuid.New(),
		UserID:          userID,
		EntryID:         entryID,
		Word:            word,
		SelectedText:    selectedText,
		Translation:     translation,
		ContextSentence: contextSentence,
		UserNote:        userNote,
		ChapterID:       chapterID,
		StoryID:         storyID,
		EaseFactor:      2.5,
		IntervalDays:    1,
		Repetitions:     0,
		NextReviewAt:    now.Add(24 * time.Hour), // 1 day initial interval
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := s.vocabRepo.Create(ctx, userVocab); err != nil {
		return nil, fmt.Errorf("failed to save vocabulary: %w", err)
	}

	// Retrieve fully populated record
	return s.vocabRepo.GetByID(ctx, userVocab.ID)
}

func (s *vocabularyService) UpdateVocabulary(ctx context.Context, id uuid.UUID, userID uuid.UUID, translation *string, userNote *string) (*domain.UserVocabulary, error) {
	vocab, err := s.vocabRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("vocabulary not found")
	}

	if vocab.UserID != userID {
		return nil, errors.New("unauthorized to update this vocabulary")
	}

	if translation != nil {
		vocab.Translation = translation
	}
	if userNote != nil {
		vocab.UserNote = userNote
	}
	vocab.UpdatedAt = time.Now()

	if err := s.vocabRepo.Update(ctx, vocab); err != nil {
		return nil, fmt.Errorf("failed to update vocabulary: %w", err)
	}

	return vocab, nil
}

func (s *vocabularyService) DeleteVocabulary(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	vocab, err := s.vocabRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("vocabulary not found")
	}

	if vocab.UserID != userID {
		return errors.New("unauthorized to delete this vocabulary")
	}

	return s.vocabRepo.Delete(ctx, id)
}

func (s *vocabularyService) ListVocabulary(ctx context.Context, userID uuid.UUID, search string, storyID *uuid.UUID, page, pageSize int) ([]domain.UserVocabulary, int64, error) {
	return s.vocabRepo.List(ctx, userID, search, storyID, page, pageSize)
}
