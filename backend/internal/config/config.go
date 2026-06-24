package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App       AppConfig
	DB        DBConfig
	Redis     RedisConfig
	JWT       JWTConfig
	Google    GoogleConfig
	OpenAI    OpenAIConfig
	Gemini    GeminiConfig
	Translate TranslateConfig
	Frontend  FrontendConfig
}

type AppConfig struct {
	Env         string
	Port        string
	Secret      string
	LogFilePath string
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

func (d DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
	)
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       string
}

func (r RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%s", r.Host, r.Port)
}

type JWTConfig struct {
	AccessSecret  string
	RefreshSecret string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
}

type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type OpenAIConfig struct {
	APIKey string
}

type GeminiConfig struct {
	APIKey string
}

type TranslateConfig struct {
	MaxChars int
}

type FrontendConfig struct {
	URL         string
	CORSOrigins string
}

func Load() (*Config, error) {
	// Load .env file if it exists (ignore error in production)
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	accessExpiry, err := time.ParseDuration(getEnv("JWT_ACCESS_EXPIRY", "15m"))
	if err != nil {
		accessExpiry = 15 * time.Minute
	}

	refreshExpiry, err := time.ParseDuration(getEnv("JWT_REFRESH_EXPIRY", "168h"))
	if err != nil {
		refreshExpiry = 168 * time.Hour
	}

	maxChars, err := strconv.Atoi(getEnv("MAX_TRANSLATE_CHARS", "500"))
	if err != nil {
		maxChars = 500
	}

	cfg := &Config{
		App: AppConfig{
			Env:         getEnv("APP_ENV", "development"),
			Port:        getEnv("APP_PORT", "8080"),
			Secret:      getEnv("APP_SECRET", "change-me-in-production"),
			LogFilePath: getEnv("LOG_FILE_PATH", "logs/app.log"),
		},
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "golingo"),
			Password: getEnv("DB_PASSWORD", "golingo_secret"),
			Name:     getEnv("DB_NAME", "golingo"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnv("REDIS_DB", "0"),
		},
		JWT: JWTConfig{
			AccessSecret:  getEnv("JWT_ACCESS_SECRET", "access-secret"),
			RefreshSecret: getEnv("JWT_REFRESH_SECRET", "refresh-secret"),
			AccessExpiry:  accessExpiry,
			RefreshExpiry: refreshExpiry,
		},
		Google: GoogleConfig{
			ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
		},
		OpenAI: OpenAIConfig{
			APIKey: getEnv("OPENAI_API_KEY", ""),
		},
		Gemini: GeminiConfig{
			APIKey: getEnv("GEMINI_API_KEY", ""),
		},
		Translate: TranslateConfig{
			MaxChars: maxChars,
		},
		Frontend: FrontendConfig{
			URL:         getEnv("FRONTEND_URL", "http://localhost:5173"),
			CORSOrigins: getEnv("CORS_ORIGINS", "http://localhost:5173"),
		},
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
