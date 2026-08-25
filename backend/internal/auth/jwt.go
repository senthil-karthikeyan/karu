package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken = errors.New("invalid or expired token")
	ErrExpiredToken = errors.New("token has expired")
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresIn    int64     `json:"expiresIn"` // seconds
	ExpiresAt    time.Time `json:"expiresAt"`
}

type TokenManager interface {
	GenerateAccessToken(userID uuid.UUID, email string) (string, int64, error)
	GenerateRefreshToken() (rawToken string, tokenHash string, expiresAt time.Time, err error)
	ValidateAccessToken(tokenStr string) (*Claims, error)
	HashToken(rawToken string) string
}

type tokenManager struct {
	accessSecret  []byte
	accessExpiry  time.Duration
	refreshExpiry time.Duration
}

func NewTokenManager(accessSecret string, accessExpiry, refreshExpiry time.Duration) TokenManager {
	return &tokenManager{
		accessSecret:  []byte(accessSecret),
		accessExpiry:  accessExpiry,
		refreshExpiry: refreshExpiry,
	}
}

func (m *tokenManager) GenerateAccessToken(userID uuid.UUID, email string) (string, int64, error) {
	now := time.Now()
	expiresAt := now.Add(m.accessExpiry)

	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(m.accessSecret)
	if err != nil {
		return "", 0, fmt.Errorf("failed to sign access token: %w", err)
	}

	return tokenString, int64(m.accessExpiry.Seconds()), nil
}

func (m *tokenManager) GenerateRefreshToken() (string, string, time.Time, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", time.Time{}, fmt.Errorf("failed to generate random bytes: %w", err)
	}

	rawToken := hex.EncodeToString(bytes)
	tokenHash := m.HashToken(rawToken)
	expiresAt := time.Now().Add(m.refreshExpiry)

	return rawToken, tokenHash, expiresAt, nil
}

func (m *tokenManager) ValidateAccessToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return m.accessSecret, nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func (m *tokenManager) HashToken(rawToken string) string {
	hash := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(hash[:])
}
