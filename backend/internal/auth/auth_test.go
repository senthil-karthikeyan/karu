package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestPasswordHashing(t *testing.T) {
	password := "my-secure-password"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if hash == password {
		t.Fatalf("Hash should not match raw password")
	}

	if !CheckPasswordHash(password, hash) {
		t.Fatalf("Expected password check to succeed")
	}

	if CheckPasswordHash("wrong-password", hash) {
		t.Fatalf("Expected password check to fail for incorrect password")
	}

	_, err = HashPassword("")
	if err == nil {
		t.Fatalf("Expected error when hashing empty password")
	}
}

func TestTokenManager(t *testing.T) {
	secret := "test-secret-key-1234567890"
	tm := NewTokenManager(secret, 15*time.Minute, 7*24*time.Hour)

	userID := uuid.New()
	email := "writer@karu.app"

	// 1. Access Token Generation & Validation
	accessToken, expiresIn, err := tm.GenerateAccessToken(userID, email)
	if err != nil {
		t.Fatalf("Failed to generate access token: %v", err)
	}

	if accessToken == "" || expiresIn <= 0 {
		t.Fatalf("Expected valid access token and expiresIn")
	}

	claims, err := tm.ValidateAccessToken(accessToken)
	if err != nil {
		t.Fatalf("Failed to validate access token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected userID %v, got %v", userID, claims.UserID)
	}
	if claims.Email != email {
		t.Errorf("Expected email %s, got %s", email, claims.Email)
	}

	// 2. Refresh Token Generation & Hashing
	rawToken, tokenHash, expiresAt, err := tm.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("Failed to generate refresh token: %v", err)
	}

	if rawToken == "" || tokenHash == "" || expiresAt.IsZero() {
		t.Fatalf("Expected non-empty refresh token fields")
	}

	// Verify hashing is deterministic
	if tm.HashToken(rawToken) != tokenHash {
		t.Fatalf("Token hashing mismatch")
	}

	// 3. Invalid token string
	_, err = tm.ValidateAccessToken("invalid.jwt.token")
	if err == nil {
		t.Fatalf("Expected error for invalid token string")
	}
}

func TestTokenExpiration(t *testing.T) {
	secret := "test-secret-key-1234567890"
	// Very short expiry
	tm := NewTokenManager(secret, 1*time.Millisecond, 1*time.Millisecond)

	userID := uuid.New()
	accessToken, _, err := tm.GenerateAccessToken(userID, "expired@karu.app")
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	time.Sleep(5 * time.Millisecond)

	_, err = tm.ValidateAccessToken(accessToken)
	if err == nil {
		t.Fatalf("Expected token to fail validation after expiration")
	}
}
