package repository

import (
	"context"
	"time"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ProgressRepository interface {
	SaveReadingProgress(ctx context.Context, userID, storyID, chapterID uuid.UUID) error
	GetReadingProgress(ctx context.Context, userID, storyID uuid.UUID) (*domain.ReadingProgress, error)
	GetAllReadingProgress(ctx context.Context, userID uuid.UUID) ([]domain.ReadingProgress, error)
	GetReadingProgressDetails(ctx context.Context, userID uuid.UUID) ([]domain.ReadingProgressDetail, error)
	GetStreak(ctx context.Context, userID uuid.UUID, timezoneOffset int) (int, error)
	GetVocabularyBreakdown(ctx context.Context, userID uuid.UUID) (int64, int64, int64, int64, error)
	GetActivityHeatmap(ctx context.Context, userID uuid.UUID, timezoneOffset int, since time.Time) (map[string]int, error)
}

type progressRepository struct {
	db *gorm.DB
}

func NewProgressRepository(db *gorm.DB) ProgressRepository {
	return &progressRepository{db: db}
}

func (r *progressRepository) SaveReadingProgress(ctx context.Context, userID, storyID, chapterID uuid.UUID) error {
	progress := &domain.ReadingProgress{
		ID:        uuid.New(),
		UserID:    userID,
		StoryID:   storyID,
		ChapterID: chapterID,
		UpdatedAt: time.Now(),
	}

	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}, {Name: "story_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"chapter_id", "updated_at"}),
	}).Create(progress).Error
}

func (r *progressRepository) GetReadingProgress(ctx context.Context, userID, storyID uuid.UUID) (*domain.ReadingProgress, error) {
	var progress domain.ReadingProgress
	err := r.db.WithContext(ctx).
		Preload("Story").
		Preload("Chapter").
		First(&progress, "user_id = ? AND story_id = ?", userID, storyID).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &progress, nil
}

func (r *progressRepository) GetAllReadingProgress(ctx context.Context, userID uuid.UUID) ([]domain.ReadingProgress, error) {
	var list []domain.ReadingProgress
	err := r.db.WithContext(ctx).
		Preload("Story").
		Preload("Chapter").
		Where("user_id = ?", userID).
		Order("updated_at DESC").
		Find(&list).Error

	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *progressRepository) GetReadingProgressDetails(ctx context.Context, userID uuid.UUID) ([]domain.ReadingProgressDetail, error) {
	var list []domain.ReadingProgressDetail
	query := `
		SELECT 
			rp.story_id,
			s.title AS story_title,
			s.slug AS story_slug,
			s.cover_url AS story_cover_url,
			s.author AS story_author,
			rp.chapter_id AS last_read_chapter_id,
			c.chapter_num AS last_read_chapter_num,
			c.title AS last_read_chapter_title,
			rp.updated_at,
			(SELECT COUNT(*) FROM chapters WHERE story_id = rp.story_id) AS total_chapters
		FROM reading_progress rp
		JOIN stories s ON s.id = rp.story_id
		JOIN chapters c ON c.id = rp.chapter_id
		WHERE rp.user_id = ?
		ORDER BY rp.updated_at DESC
	`
	err := r.db.WithContext(ctx).Raw(query, userID).Scan(&list).Error
	if err != nil {
		return nil, err
	}
	return list, nil
}

func (r *progressRepository) GetVocabularyBreakdown(ctx context.Context, userID uuid.UUID) (int64, int64, int64, int64, error) {
	var newC, learningC, masteredC, totalC int64

	// Total
	if err := r.db.WithContext(ctx).Model(&domain.UserVocabulary{}).Where("user_id = ?", userID).Count(&totalC).Error; err != nil {
		return 0, 0, 0, 0, err
	}

	// New (repetitions = 0)
	if err := r.db.WithContext(ctx).Model(&domain.UserVocabulary{}).Where("user_id = ? AND repetitions = 0", userID).Count(&newC).Error; err != nil {
		return 0, 0, 0, 0, err
	}

	// Learning (0 < repetitions < 4)
	if err := r.db.WithContext(ctx).Model(&domain.UserVocabulary{}).Where("user_id = ? AND repetitions > 0 AND repetitions < 4", userID).Count(&learningC).Error; err != nil {
		return 0, 0, 0, 0, err
	}

	// Mastered (repetitions >= 4)
	if err := r.db.WithContext(ctx).Model(&domain.UserVocabulary{}).Where("user_id = ? AND repetitions >= 4", userID).Count(&masteredC).Error; err != nil {
		return 0, 0, 0, 0, err
	}

	return newC, learningC, masteredC, totalC, nil
}

func (r *progressRepository) GetActivityHeatmap(ctx context.Context, userID uuid.UUID, timezoneOffset int, since time.Time) (map[string]int, error) {
	query := `
		SELECT act_date, SUM(act_count) AS count
		FROM (
			SELECT DATE(reviewed_at + ? * INTERVAL '1 minute') AS act_date, COUNT(*) AS act_count
			FROM flashcard_reviews
			WHERE user_id = ? AND reviewed_at >= ?
			GROUP BY act_date
			UNION ALL
			SELECT DATE(updated_at + ? * INTERVAL '1 minute') AS act_date, COUNT(*) AS act_count
			FROM reading_progress
			WHERE user_id = ? AND updated_at >= ?
			GROUP BY act_date
		) combined
		GROUP BY act_date
		ORDER BY act_date ASC
	`

	type Result struct {
		ActDate time.Time
		Count   int
	}

	var results []Result
	err := r.db.WithContext(ctx).Raw(query, timezoneOffset, userID, since, timezoneOffset, userID, since).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	heatmap := make(map[string]int)
	for _, res := range results {
		heatmap[res.ActDate.Format("2006-01-02")] = res.Count
	}

	return heatmap, nil
}

func (r *progressRepository) GetStreak(ctx context.Context, userID uuid.UUID, timezoneOffset int) (int, error) {
	// Query all unique dates of user activity in user's timezone, sorted descending.
	// We check reviewed_at from flashcard_reviews and updated_at from reading_progress.
	// SQL query:
	query := `
		SELECT DISTINCT DATE(reviewed_at + ? * INTERVAL '1 minute') AS act_date
		FROM flashcard_reviews
		WHERE user_id = ?
		UNION
		SELECT DISTINCT DATE(updated_at + ? * INTERVAL '1 minute') AS act_date
		FROM reading_progress
		WHERE user_id = ?
		ORDER BY act_date DESC
	`

	var dates []time.Time
	err := r.db.Raw(query, timezoneOffset, userID, timezoneOffset, userID).Scan(&dates).Error
	if err != nil {
		return 0, err
	}

	if len(dates) == 0 {
		return 0, nil
	}

	// Calculate client local current date
	localNow := time.Now().UTC().Add(time.Duration(timezoneOffset) * time.Minute)
	todayStr := localNow.Format("2006-01-02")
	yesterdayStr := localNow.AddDate(0, 0, -1).Format("2006-01-02")

	// Convert dates to "YYYY-MM-DD" strings for easier comparison
	var dateStrings []string
	for _, d := range dates {
		dateStrings = append(dateStrings, d.Format("2006-01-02"))
	}

	// The first date in list must be today or yesterday to continue the streak
	firstDate := dateStrings[0]
	if firstDate != todayStr && firstDate != yesterdayStr {
		return 0, nil
	}

	streak := 1
	current := dates[0]

	for i := 1; i < len(dates); i++ {
		prev := dates[i]
		expectedPrevStr := current.AddDate(0, 0, -1).Format("2006-01-02")
		prevStr := prev.Format("2006-01-02")
		if prevStr == expectedPrevStr {
			streak++
			current = prev
		} else if prevStr == current.Format("2006-01-02") {
			continue
		} else {
			break
		}
	}

	return streak, nil
}
