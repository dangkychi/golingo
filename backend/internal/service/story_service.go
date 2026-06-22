package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/google/uuid"
)

type StoryService interface {
	// Public
	ListStories(ctx context.Context, filter repository.StoryFilter) ([]domain.Story, int64, error)
	GetStoryByID(ctx context.Context, id uuid.UUID) (*domain.Story, error)
	GetStoryBySlug(ctx context.Context, slug string) (*domain.Story, error)
	ListChapters(ctx context.Context, storySlug string) ([]domain.Chapter, error)
	GetChapter(ctx context.Context, storySlug string, chapterNum int) (*domain.Chapter, *domain.Story, error)
	ListGenres(ctx context.Context) ([]domain.Genre, error)

	// Admin/Editor CRUD
	CreateStory(ctx context.Context, input CreateStoryInput) (*domain.Story, error)
	UpdateStory(ctx context.Context, id uuid.UUID, input UpdateStoryInput) (*domain.Story, error)
	DeleteStory(ctx context.Context, id uuid.UUID) error
	CreateChapter(ctx context.Context, storyID uuid.UUID, input CreateChapterInput) (*domain.Chapter, error)
	UpdateChapter(ctx context.Context, id uuid.UUID, input UpdateChapterInput) (*domain.Chapter, error)
	DeleteChapter(ctx context.Context, id uuid.UUID) error

	// Gutenberg import
	SearchGutenberg(ctx context.Context, query string, page int) (*GutenbergSearchResult, error)
	ImportFromGutenberg(ctx context.Context, gutenbergID int, difficulty string, genreIDs []uint, createdBy uuid.UUID) (*domain.Story, error)
}

// --- Input types ---

type CreateStoryInput struct {
	Title       string    `json:"title" binding:"required"`
	Description *string   `json:"description"`
	CoverURL    *string   `json:"cover_url"`
	Author      *string   `json:"author"`
	Difficulty  string    `json:"difficulty" binding:"required"`
	Status      string    `json:"status"`
	GenreIDs    []uint    `json:"genre_ids"`
	CreatedBy   uuid.UUID `json:"-"`
}

type UpdateStoryInput struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	CoverURL    *string `json:"cover_url"`
	Author      *string `json:"author"`
	Difficulty  *string `json:"difficulty"`
	Status      *string `json:"status"`
	GenreIDs    *[]uint `json:"genre_ids"`
}

type CreateChapterInput struct {
	Title   *string `json:"title"`
	Content string  `json:"content" binding:"required"`
}

type UpdateChapterInput struct {
	Title   *string `json:"title"`
	Content *string `json:"content"`
}

// --- Gutenberg types ---

type GutenbergBook struct {
	ID      int    `json:"id"`
	Title   string `json:"title"`
	Authors []struct {
		Name string `json:"name"`
	} `json:"authors"`
	Subjects []string          `json:"subjects"`
	Formats  map[string]string `json:"formats"`
	Imported bool              `json:"imported"`
}

type GutenbergSearchResult struct {
	Count    int             `json:"count"`
	Next     *string         `json:"next"`
	Previous *string         `json:"previous"`
	Results  []GutenbergBook `json:"results"`
}

// --- Implementation ---

type storyService struct {
	storyRepo   repository.StoryRepository
	chapterRepo repository.ChapterRepository
	genreRepo   repository.GenreRepository
}

func NewStoryService(
	storyRepo repository.StoryRepository,
	chapterRepo repository.ChapterRepository,
	genreRepo repository.GenreRepository,
) StoryService {
	return &storyService{
		storyRepo:   storyRepo,
		chapterRepo: chapterRepo,
		genreRepo:   genreRepo,
	}
}

// --- Public methods ---

func (s *storyService) ListStories(ctx context.Context, filter repository.StoryFilter) ([]domain.Story, int64, error) {
	return s.storyRepo.List(ctx, filter)
}

func (s *storyService) GetStoryByID(ctx context.Context, id uuid.UUID) (*domain.Story, error) {
	return s.storyRepo.GetByID(ctx, id)
}

func (s *storyService) GetStoryBySlug(ctx context.Context, slug string) (*domain.Story, error) {
	return s.storyRepo.GetBySlug(ctx, slug)
}

func (s *storyService) ListChapters(ctx context.Context, storySlug string) ([]domain.Chapter, error) {
	story, err := s.storyRepo.GetBySlug(ctx, storySlug)
	if err != nil {
		return nil, errors.New("story not found")
	}
	return s.chapterRepo.ListByStoryID(ctx, story.ID)
}

func (s *storyService) GetChapter(ctx context.Context, storySlug string, chapterNum int) (*domain.Chapter, *domain.Story, error) {
	story, err := s.storyRepo.GetBySlug(ctx, storySlug)
	if err != nil {
		return nil, nil, errors.New("story not found")
	}
	chapter, err := s.chapterRepo.GetByStoryAndNum(ctx, story.ID, chapterNum)
	if err != nil {
		return nil, nil, errors.New("chapter not found")
	}
	return chapter, story, nil
}

func (s *storyService) ListGenres(ctx context.Context) ([]domain.Genre, error) {
	return s.genreRepo.ListAll(ctx)
}

// --- Admin CRUD ---

func (s *storyService) CreateStory(ctx context.Context, input CreateStoryInput) (*domain.Story, error) {
	slug := generateSlug(input.Title)

	status := domain.StatusOngoing
	if input.Status != "" {
		status = domain.StoryStatus(input.Status)
	}

	story := &domain.Story{
		ID:          uuid.New(),
		Title:       input.Title,
		Slug:        slug,
		Description: input.Description,
		CoverURL:    input.CoverURL,
		Author:      input.Author,
		Difficulty:  domain.Difficulty(input.Difficulty),
		Status:      status,
		CreatedBy:   &input.CreatedBy,
	}

	if err := s.storyRepo.Create(ctx, story); err != nil {
		return nil, fmt.Errorf("failed to create story: %w", err)
	}

	if len(input.GenreIDs) > 0 {
		if err := s.storyRepo.SetGenres(ctx, story.ID, input.GenreIDs); err != nil {
			return nil, fmt.Errorf("failed to set genres: %w", err)
		}
	}

	return s.storyRepo.GetByID(ctx, story.ID)
}

func (s *storyService) UpdateStory(ctx context.Context, id uuid.UUID, input UpdateStoryInput) (*domain.Story, error) {
	story, err := s.storyRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("story not found")
	}

	if input.Title != nil {
		story.Title = *input.Title
		story.Slug = generateSlug(*input.Title)
	}
	if input.Description != nil {
		story.Description = input.Description
	}
	if input.CoverURL != nil {
		story.CoverURL = input.CoverURL
	}
	if input.Author != nil {
		story.Author = input.Author
	}
	if input.Difficulty != nil {
		story.Difficulty = domain.Difficulty(*input.Difficulty)
	}
	if input.Status != nil {
		story.Status = domain.StoryStatus(*input.Status)
	}

	if err := s.storyRepo.Update(ctx, story); err != nil {
		return nil, fmt.Errorf("failed to update story: %w", err)
	}

	if input.GenreIDs != nil {
		if err := s.storyRepo.SetGenres(ctx, id, *input.GenreIDs); err != nil {
			return nil, fmt.Errorf("failed to update genres: %w", err)
		}
	}

	return s.storyRepo.GetByID(ctx, id)
}

func (s *storyService) DeleteStory(ctx context.Context, id uuid.UUID) error {
	if _, err := s.storyRepo.GetByID(ctx, id); err != nil {
		return errors.New("story not found")
	}
	return s.storyRepo.Delete(ctx, id)
}

func (s *storyService) CreateChapter(ctx context.Context, storyID uuid.UUID, input CreateChapterInput) (*domain.Chapter, error) {
	if _, err := s.storyRepo.GetByID(ctx, storyID); err != nil {
		return nil, errors.New("story not found")
	}

	// Get next chapter number
	count, _ := s.chapterRepo.CountByStoryID(ctx, storyID)
	nextNum := int(count) + 1

	chapter := &domain.Chapter{
		ID:         uuid.New(),
		StoryID:    storyID,
		ChapterNum: nextNum,
		Title:      input.Title,
		Content:    input.Content,
		WordCount:  countWords(input.Content),
	}

	if err := s.chapterRepo.Create(ctx, chapter); err != nil {
		return nil, fmt.Errorf("failed to create chapter: %w", err)
	}

	return chapter, nil
}

func (s *storyService) UpdateChapter(ctx context.Context, id uuid.UUID, input UpdateChapterInput) (*domain.Chapter, error) {
	chapter, err := s.chapterRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("chapter not found")
	}

	if input.Title != nil {
		chapter.Title = input.Title
	}
	if input.Content != nil {
		chapter.Content = *input.Content
		chapter.WordCount = countWords(*input.Content)
	}

	if err := s.chapterRepo.Update(ctx, chapter); err != nil {
		return nil, fmt.Errorf("failed to update chapter: %w", err)
	}

	return chapter, nil
}

func (s *storyService) DeleteChapter(ctx context.Context, id uuid.UUID) error {
	if _, err := s.chapterRepo.GetByID(ctx, id); err != nil {
		return errors.New("chapter not found")
	}
	return s.chapterRepo.Delete(ctx, id)
}

// --- Gutenberg ---

func (s *storyService) SearchGutenberg(ctx context.Context, query string, page int) (*GutenbergSearchResult, error) {
	if page <= 0 {
		page = 1
	}
	urlStr := fmt.Sprintf("https://gutendex.com/books?search=%s&languages=en&page=%d", url.QueryEscape(query), page)

	resp, err := http.Get(urlStr)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch gutenberg: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("gutenberg API returned status %d", resp.StatusCode)
	}

	var result GutenbergSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode gutenberg response: %w", err)
	}

	// Mark already imported books
	for i, book := range result.Results {
		if existing, err := s.storyRepo.GetByGutenbergID(ctx, book.ID); err == nil && existing != nil {
			result.Results[i].Imported = true
		}
	}

	return &result, nil
}

func (s *storyService) ImportFromGutenberg(ctx context.Context, gutenbergID int, difficulty string, genreIDs []uint, createdBy uuid.UUID) (*domain.Story, error) {
	// 0. Check if already imported
	existingStory, err := s.storyRepo.GetByGutenbergID(ctx, gutenbergID)
	isUpdate := err == nil && existingStory != nil

	// 1. Fetch book metadata
	metaURL := fmt.Sprintf("https://gutendex.com/books/%d", gutenbergID)
	resp, err := http.Get(metaURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch book metadata: %w", err)
	}
	defer resp.Body.Close()

	var book GutenbergBook
	if err := json.NewDecoder(resp.Body).Decode(&book); err != nil {
		return nil, fmt.Errorf("failed to decode book metadata: %w", err)
	}

	// 2. Find text content URL
	textURL := ""
	for mime, url := range book.Formats {
		if strings.Contains(mime, "text/plain") && strings.HasSuffix(url, ".txt") {
			textURL = url
			break
		}
	}
	if textURL == "" {
		// Fallback: try any text/plain
		for mime, url := range book.Formats {
			if strings.Contains(mime, "text/plain") {
				textURL = url
				break
			}
		}
	}
	if textURL == "" {
		return nil, errors.New("no text content available for this book")
	}

	// 3. Download text content
	textResp, err := http.Get(textURL)
	if err != nil {
		return nil, fmt.Errorf("failed to download text: %w", err)
	}
	defer textResp.Body.Close()

	bodyBytes, err := io.ReadAll(textResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read text content: %w", err)
	}

	content := string(bodyBytes)
	if !utf8.ValidString(content) {
		// Try to clean non-UTF8 characters
		content = strings.ToValidUTF8(content, "")
	}

	// 4. Parse chapters from text
	chapters := splitIntoChapters(content)
	if len(chapters) == 0 {
		return nil, errors.New("could not parse any chapters from the book")
	}

	// 5. Sync/Create story & chapters
	author := ""
	if len(book.Authors) > 0 {
		author = book.Authors[0].Name
	}

	if isUpdate {
		// Update existing story metadata (Keep existing slug to preserve URLs/bookmarks)
		existingStory.Title = book.Title
		existingStory.Author = &author
		existingStory.Difficulty = domain.Difficulty(difficulty)
		existingStory.Status = domain.StatusCompleted

		if err := s.storyRepo.Update(ctx, existingStory); err != nil {
			return nil, fmt.Errorf("failed to update story: %w", err)
		}

		if len(genreIDs) > 0 {
			_ = s.storyRepo.SetGenres(ctx, existingStory.ID, genreIDs)
		}

		// Load existing chapters
		existingChapters, err := s.chapterRepo.ListByStoryID(ctx, existingStory.ID)
		if err != nil {
			existingChapters = []domain.Chapter{}
		}

		existingChaptersMap := make(map[int]domain.Chapter)
		for _, ec := range existingChapters {
			existingChaptersMap[ec.ChapterNum] = ec
		}

		// Update / insert chapters by chapter_num
		for i, ch := range chapters {
			chapterNum := i + 1
			wordCount := countWords(ch.Content)

			if ec, found := existingChaptersMap[chapterNum]; found {
				ec.Title = ch.Title
				ec.Content = ch.Content
				ec.WordCount = wordCount
				_ = s.chapterRepo.Update(ctx, &ec)
			} else {
				newCh := &domain.Chapter{
					ID:         uuid.New(),
					StoryID:    existingStory.ID,
					ChapterNum: chapterNum,
					Title:      ch.Title,
					Content:    ch.Content,
					WordCount:  wordCount,
				}
				_ = s.chapterRepo.Create(ctx, newCh)
			}
		}

		// Delete extra chapters if the new parsed count is lower than the old count
		newChaptersCount := len(chapters)
		for _, ec := range existingChapters {
			if ec.ChapterNum > newChaptersCount {
				_ = s.chapterRepo.Delete(ctx, ec.ID)
			}
		}

		return s.storyRepo.GetByID(ctx, existingStory.ID)
	}

	// Else: create a new story
	story := &domain.Story{
		ID:          uuid.New(),
		Title:       book.Title,
		Slug:        generateSlug(book.Title),
		Author:      &author,
		Difficulty:  domain.Difficulty(difficulty),
		Status:      domain.StatusCompleted,
		CreatedBy:   &createdBy,
		GutenbergID: &gutenbergID,
	}

	if err := s.storyRepo.Create(ctx, story); err != nil {
		return nil, fmt.Errorf("failed to create story: %w", err)
	}

	if len(genreIDs) > 0 {
		_ = s.storyRepo.SetGenres(ctx, story.ID, genreIDs)
	}

	// Create chapters
	for i, ch := range chapters {
		chapter := &domain.Chapter{
			ID:         uuid.New(),
			StoryID:    story.ID,
			ChapterNum: i + 1,
			Title:      ch.Title,
			Content:    ch.Content,
			WordCount:  countWords(ch.Content),
		}
		if err := s.chapterRepo.Create(ctx, chapter); err != nil {
			continue
		}
	}

	return s.storyRepo.GetByID(ctx, story.ID)
}

// --- Helper functions ---

func generateSlug(title string) string {
	slug := strings.ToLower(title)
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	slug = reg.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if len(slug) > 200 {
		slug = slug[:200]
	}
	// Add short UUID suffix for uniqueness
	slug = slug + "-" + uuid.New().String()[:6]
	return slug
}

func countWords(content string) int {
	fields := strings.Fields(content)
	return len(fields)
}

type parsedChapter struct {
	Title   *string
	Content string
}

func splitIntoChapters(text string) []parsedChapter {
	// Remove Gutenberg header/footer
	text = removeGutenbergBoilerplate(text)

	// Try to split by common chapter patterns
	chapterPattern := regexp.MustCompile(`(?im)^\s*(chapter|CHAPTER)\s+([IVXLCDM\d]+\.?)\s*[.\-:]?\s*(.*)$`)
	locations := chapterPattern.FindAllStringIndex(text, -1)

	if len(locations) < 2 {
		// Can't find chapter markers — split by fixed size (~3000 words)
		return splitByWordCount(text, 3000)
	}

	var chapters []parsedChapter
	for i, loc := range locations {
		headerLine := text[loc[0]:loc[1]]
		title := strings.TrimSpace(headerLine)

		var content string
		if i+1 < len(locations) {
			content = text[loc[1]:locations[i+1][0]]
		} else {
			content = text[loc[1]:]
		}
		content = strings.TrimSpace(content)

		if len(content) < 50 {
			continue // Skip empty chapters
		}

		chapters = append(chapters, parsedChapter{
			Title:   &title,
			Content: content,
		})
	}

	if len(chapters) == 0 {
		return splitByWordCount(text, 3000)
	}

	return chapters
}

func splitByWordCount(text string, wordsPerChapter int) []parsedChapter {
	words := strings.Fields(text)
	if len(words) == 0 {
		return nil
	}

	var chapters []parsedChapter
	for i := 0; i < len(words); i += wordsPerChapter {
		end := i + wordsPerChapter
		if end > len(words) {
			end = len(words)
		}
		content := strings.Join(words[i:end], " ")
		chNum := len(chapters) + 1
		title := fmt.Sprintf("Part %d", chNum)
		chapters = append(chapters, parsedChapter{
			Title:   &title,
			Content: content,
		})
	}
	return chapters
}

func removeGutenbergBoilerplate(text string) string {
	// Remove header (everything before "*** START OF")
	startPattern := regexp.MustCompile(`(?i)\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*`)
	if loc := startPattern.FindStringIndex(text); loc != nil {
		text = text[loc[1]:]
	}

	// Remove footer (everything after "*** END OF")
	endPattern := regexp.MustCompile(`(?i)\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG`)
	if loc := endPattern.FindStringIndex(text); loc != nil {
		text = text[:loc[0]]
	}

	return strings.TrimSpace(text)
}
