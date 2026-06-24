package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"net/http"
	"time"

	"github.com/dangkychi/GOLingo/internal/config"
)

type TranslateService struct {
	cfg    config.TranslateConfig
	apiKey string
}

func NewTranslateService(cfg *config.Config) *TranslateService {
	return &TranslateService{
		cfg:    cfg.Translate,
		apiKey: cfg.Gemini.APIKey,
	}
}

type googleTranslateRequest struct {
	Q      []string `json:"q"`
	Target string   `json:"target"`
	Format string   `json:"format"`
}

type googleTranslateResponse struct {
	Data struct {
		Translations []struct {
			TranslatedText string `json:"translatedText"`
		} `json:"translations"`
	} `json:"data"`
}

func (s *TranslateService) Translate(ctx context.Context, text, contextParagraph, targetLang string) (string, error) {
	if s.apiKey == "" {
		return "", errors.New("google translate api key is not configured")
	}

	// Validate character count limit
	if len(text) > s.cfg.MaxChars {
		return "", fmt.Errorf("text length exceeds limit of %d characters", s.cfg.MaxChars)
	}

	// Default target language if empty
	if targetLang == "" {
		targetLang = "vi"
	}

	reqBody := googleTranslateRequest{
		Q:      []string{text},
		Target: targetLang,
		Format: "text", // Ensures returned text does not have HTML tags, but special characters might still be escaped
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("https://translation.googleapis.com/language/translate/v2?key=%s", s.apiKey)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		buf := new(bytes.Buffer)
		_, _ = buf.ReadFrom(resp.Body)
		return "", fmt.Errorf("google translate api returned non-ok status: %d, response: %s", resp.StatusCode, buf.String())
	}

	var googleResp googleTranslateResponse
	if err := json.NewDecoder(resp.Body).Decode(&googleResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(googleResp.Data.Translations) == 0 {
		return "", errors.New("no translation response from google translate")
	}

	translatedText := googleResp.Data.Translations[0].TranslatedText
	return html.UnescapeString(translatedText), nil
}
