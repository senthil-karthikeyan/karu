package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/joho/godotenv/autoload"
)

type Config struct {
	AppEnv            string
	Port              int
	FrontendURL       string
	GothSessionSecret string
	Database          DatabaseConfig
	JWT               JWTConfig
	GoogleOAuth       GoogleOAuthConfig
	CORS              CORSConfig
}

type DatabaseConfig struct {
	URL             string
	MaxConns        int32
	MinConns        int32
	MaxConnLifetime time.Duration
	MaxConnIdleTime time.Duration
	ConnectTimeout  time.Duration
}

type JWTConfig struct {
	AccessSecret  string
	RefreshSecret string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
}

type GoogleOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type CORSConfig struct {
	AllowedOrigins []string
}

// ConnectionString returns the PostgreSQL connection string.
func (d DatabaseConfig) ConnectionString() string {
	return d.URL
}

// Load reads and parses configuration from environment variables.
func Load() *Config {
	port, err := strconv.Atoi(getEnv("PORT", "8080"))
	if err != nil {
		port = 8080
	}

	maxConns, _ := strconv.Atoi(getEnv("DB_MAX_CONNS", "25"))
	minConns, _ := strconv.Atoi(getEnv("DB_MIN_CONNS", "2"))

	accessExpiryMinutes, _ := strconv.Atoi(getEnvAny([]string{"JWT_ACCESS_EXPIRATION", "JWT_ACCESS_EXPIRY_MINUTES"}, "60"))
	refreshExpiryDays, _ := strconv.Atoi(getEnvAny([]string{"JWT_REFRESH_EXPIRATION", "JWT_REFRESH_EXPIRY_DAYS"}, "7"))

	allowedOriginsStr := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173")
	var allowedOrigins []string
	for _, o := range strings.Split(allowedOriginsStr, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}

	jwtAccessSecret := getEnvAny([]string{"JWT_ACCESS_SECRET", "JWT_SECRET"}, "super-secret-karu-jwt-access-key")
	jwtRefreshSecret := getEnvAny([]string{"JWT_REFRESH_SECRET", "JWT_SECRET"}, "super-secret-karu-jwt-refresh-key")

	dbURL := getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/karu")

	return &Config{
		AppEnv:            getEnv("APP_ENV", "development"),
		Port:              port,
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:3000"),
		GothSessionSecret: getEnv("GOTH_SESSION_SECRET", "super-secret-karu-goth-session-secret"),
		Database: DatabaseConfig{
			URL:             dbURL,
			MaxConns:        int32(maxConns),
			MinConns:        int32(minConns),
			MaxConnLifetime: 1 * time.Hour,
			MaxConnIdleTime: 30 * time.Minute,
			ConnectTimeout:  10 * time.Second,
		},
		JWT: JWTConfig{
			AccessSecret:  jwtAccessSecret,
			RefreshSecret: jwtRefreshSecret,
			AccessExpiry:  time.Duration(accessExpiryMinutes) * time.Minute,
			RefreshExpiry: time.Duration(refreshExpiryDays) * 24 * time.Hour,
		},
		GoogleOAuth: GoogleOAuthConfig{
			ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
		},
		CORS: CORSConfig{
			AllowedOrigins: allowedOrigins,
		},
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvAny(keys []string, defaultVal string) string {
	for _, key := range keys {
		if val := os.Getenv(key); val != "" {
			return val
		}
	}
	return defaultVal
}
