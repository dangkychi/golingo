package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/dangkychi/GOLingo/internal/config"
)

type AIService interface {
	Explain(ctx context.Context, text, contextText, targetLang string) (string, error)
	Summarize(ctx context.Context, chapterContent, targetLang string) (string, error)
	GenerateQuiz(ctx context.Context, chapterContent, targetLang string) (string, error)
}

type aiService struct {
	cfg *config.Config
}

func NewAIService(cfg *config.Config) AIService {
	return &aiService{cfg: cfg}
}

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiGenerationConfig struct {
	ResponseMimeType string `json:"responseMimeType,omitempty"`
}

type GeminiRequest struct {
	Contents         []GeminiContent        `json:"contents"`
	GenerationConfig *GeminiGenerationConfig `json:"generationConfig,omitempty"`
}

type GeminiCandidate struct {
	Content struct {
		Parts []GeminiPart `json:"parts"`
	} `json:"content"`
}

type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
}

func (s *aiService) callGemini(ctx context.Context, prompt string, jsonMode bool) (string, error) {
	apiKey := s.cfg.Gemini.APIKey

	if apiKey == "" {
		// Mock fallback if API key is not provided
		if jsonMode {
			return `[
				{
					"question": "What is the primary purpose of learning a language on GOLingo?",
					"options": ["To read stories & learn vocabulary", "To watch films", "To play games only", "To write emails"],
					"correct_index": 0,
					"explanation": "GOLingo uses a story-driven approach to help users read and build spaced-repetition flashcards."
				},
				{
					"question": "Which system is used to review vocabulary?",
					"options": ["SM-2 Spaced Repetition", "Random memory game", "Traditional paper exams", "No review is needed"],
					"correct_index": 0,
					"explanation": "The flashcard review in GOLingo implements the SM-2 spaced repetition algorithm."
				},
				{
					"question": "What does AI Explain help with?",
					"options": ["Explaining highlighted text grammar and context", "Translating single words only", "Playing audio pronunciation", "Correcting writing typos"],
					"correct_index": 0,
					"explanation": "AI Explain explains grammar, syntax, meaning, and context for any highlighted story text."
				},
				{
					"question": "Where are user flashcards saved?",
					"options": ["In the database associated with user account", "On the local browser storage only", "Sent to an email", "Not saved anywhere"],
					"correct_index": 0,
					"explanation": "Flashcards are stored in the GOLingo PostgreSQL database to track spacing intervals across all devices."
				},
				{
					"question": "What is the default daily session limit in GOLingo?",
					"options": ["50 cards", "10 cards", "100 cards", "Unlimited"],
					"correct_index": 0,
					"explanation": "The default flashcard session limit is configured as 50 cards, customizable via .env."
				}
			]`, nil
		}
		return "*(GEMINI_API_KEY is not configured. This is a mock response.)*\n\nThis text was highlighted in GOLingo. To get precise AI explanations or real-time summaries, please configure the API key in your `.env` file.\n\n**Grammar Note:** Highlighted elements are processed by our context analyzer to explain complex phrase patterns and idioms.", nil
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", apiKey)
	zap.L().Info("[callGemini] Calling Gemini API",
		zap.String("apiKeyPrefix", apiKey[:min(10, len(apiKey))]+"..."),
		zap.Bool("jsonMode", jsonMode),
	)

	reqPayload := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: prompt},
				},
			},
		},
	}

	if jsonMode {
		reqPayload.GenerationConfig = &GeminiGenerationConfig{
			ResponseMimeType: "application/json",
		}
	}

	jsonBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini http request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		zap.L().Error("[callGemini] API error",
			zap.Int("status", resp.StatusCode),
			zap.String("response", string(bodyBytes)),
		)
		return "", fmt.Errorf("gemini api returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	zap.L().Info("[callGemini] SUCCESS", zap.Int("status", resp.StatusCode))

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("no content generated by gemini")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}

func (s *aiService) Explain(ctx context.Context, text, contextText, targetLang string) (string, error) {
	prompt := fmt.Sprintf(`You are an expert language teacher. The user is reading a story to learn a foreign language.
Explain the grammar, syntax, meaning, and usage of the following phrase/sentence in the context of the story.
Keep it concise, educational, and engaging. Return the result in Markdown format. Highlighting key terms is recommended.

Sentence/Phrase to explain: "%s"
Story context around the phrase: "%s"

Please write your explanation in the user's target language: "%s".`, text, contextText, targetLang)

	return s.callGemini(ctx, prompt, false)
}

func (s *aiService) Summarize(ctx context.Context, chapterContent, targetLang string) (string, error) {
	prompt := fmt.Sprintf(`You are an expert language assistant.
Provide a brief, concise summary of the following story chapter. Summarize the main plot points and key takeaways.
Keep it in Markdown format with a few bullet points, under 150 words.

Chapter Content:
"%s"

Please write the summary in the user's target language: "%s".`, chapterContent, targetLang)

	return s.callGemini(ctx, prompt, false)
}

func (s *aiService) GenerateQuiz(ctx context.Context, chapterContent, targetLang string) (string, error) {
	prompt := fmt.Sprintf(`You are an expert language teacher. Generate a 5-question multiple choice comprehension quiz based on the following chapter content.
The questions should test comprehension of the plot, vocabulary, or grammar.

You MUST return a JSON array conforming to this schema:
[
  {
    "question": "Question text?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correct_index": 0,
    "explanation": "Why this option is correct."
  }
]

Do not include markdown code block wrapping (like `+"`"+`json). Return ONLY the raw JSON array.
All questions, choices, and explanations MUST be written in the user's target language: "%s".

Chapter Content:
"%s"`, targetLang, chapterContent)

	return s.callGemini(ctx, prompt, true)
}
