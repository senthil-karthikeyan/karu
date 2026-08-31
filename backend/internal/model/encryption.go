package model

import (
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

const (
	ExpectedEncryptionVersion   = 1
	ExpectedEncryptionAlgorithm = "AES-GCM"
	ExpectedAsymmetricAlgorithm = "ECDH-P256"
	ExpectedHashAlgorithm       = "SHA-256"
	DefaultPBKDF2Iterations     = 600000
	MinPBKDF2Iterations         = 100000
	MaxPBKDF2Iterations         = 2000000
	ExpectedGCMIVBytesLength    = 12 // 96-bit AES-GCM IV
	MinSaltBytesLength          = 8
	MaxSaltBytesLength          = 64
	MaxCiphertextBytesLength    = 10 * 1024 * 1024 // 10MB limit for screenplay document
	MaxWrappedKeyBytesLength    = 4096             // 4KB limit for wrapped key / private key
	MaxPublicKeyBytesLength     = 2048             // 2KB limit for public key export
)

// UserEncryptionMetadataResponse represents the public salt & PBKDF2 parameters for deriving the UEK.
type UserEncryptionMetadataResponse struct {
	UserID        uuid.UUID `json:"userId"`
	Salt          string    `json:"salt"`
	Iterations    int       `json:"iterations"`
	HashAlgorithm string    `json:"hashAlgorithm"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// UserEncryptionMetadataRequest is sent when configuring the client-side encryption secret.
type UserEncryptionMetadataRequest struct {
	Salt          string `json:"salt" binding:"required"`
	Iterations    int    `json:"iterations"`
	HashAlgorithm string `json:"hashAlgorithm"`
}

// EncryptedPayload represents the versioned AES-GCM ciphertext payload produced by Web Crypto.
type EncryptedPayload struct {
	Version    int    `json:"version"`
	Algorithm  string `json:"algorithm"`
	IV         string `json:"iv"`         // Base64 encoded 12-byte IV
	Ciphertext string `json:"ciphertext"` // Base64 encoded ciphertext + GCM auth tag
}

// WrappedKeyPayload represents generic wrapped key material (PEK or SCK).
type WrappedKeyPayload struct {
	Version    int    `json:"version"`
	Algorithm  string `json:"algorithm"`
	IV         string `json:"iv"`         // Base64 encoded 12-byte IV
	WrappedKey string `json:"wrappedKey"` // Base64 encoded wrapped key bytes
}

// ProjectKeyResponse is returned when retrieving a user's wrapped Project Encryption Key (PEK).
type ProjectKeyResponse struct {
	ProjectID  uuid.UUID `json:"projectId"`
	UserID     uuid.UUID `json:"userId"`
	Version    int       `json:"version"`
	Algorithm  string    `json:"algorithm"`
	IV         string    `json:"iv"`
	WrappedKey string    `json:"wrappedKey"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// ScreenplayKeyResponse is returned when retrieving a wrapped key for a screenplay.
type ScreenplayKeyResponse struct {
	ScreenplayID uuid.UUID `json:"screenplayId"`
	Version      int       `json:"version"`
	Algorithm    string    `json:"algorithm"`
	IV           string    `json:"iv"`
	WrappedKey   string    `json:"wrappedKey"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// UserEncryptionIdentityPayload represents the public key and UEK-wrapped private key for offline sharing.
type UserEncryptionIdentityPayload struct {
	UserID              uuid.UUID `json:"userId"`
	PublicKey           string    `json:"publicKey"`           // Base64 SPKI
	EncryptedPrivateKey string    `json:"encryptedPrivateKey"` // Base64 PKCS#8 wrapped with UEK
	KeyIV               string    `json:"keyIv"`               // Base64 12-byte IV
	Algorithm           string    `json:"algorithm"`           // ECDH-P256
	Version             int       `json:"version"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

// ValidateSalt validates the format, size, and Base64 validity of the salt.
func ValidateSalt(salt string) error {
	if salt == "" {
		return errors.New("salt is required")
	}
	bytes, err := base64.StdEncoding.DecodeString(salt)
	if err != nil {
		return fmt.Errorf("salt must be valid Base64: %w", err)
	}
	if len(bytes) < MinSaltBytesLength || len(bytes) > MaxSaltBytesLength {
		return fmt.Errorf("salt must be between %d and %d bytes (got %d bytes)", MinSaltBytesLength, MaxSaltBytesLength, len(bytes))
	}
	return nil
}

// ValidateEncryptedPayload ensures the payload matches version 1 AES-GCM standards and Base64 length bounds.
func ValidateEncryptedPayload(p EncryptedPayload) error {
	if p.Version != ExpectedEncryptionVersion {
		return fmt.Errorf("unsupported encryption version %d (expected %d)", p.Version, ExpectedEncryptionVersion)
	}
	if p.Algorithm != ExpectedEncryptionAlgorithm {
		return fmt.Errorf("unsupported encryption algorithm '%s' (expected '%s')", p.Algorithm, ExpectedEncryptionAlgorithm)
	}
	if p.IV == "" {
		return errors.New("IV is required")
	}
	ivBytes, err := base64.StdEncoding.DecodeString(p.IV)
	if err != nil {
		return fmt.Errorf("IV must be valid Base64: %w", err)
	}
	if len(ivBytes) != ExpectedGCMIVBytesLength {
		return fmt.Errorf("invalid IV length: expected %d bytes for AES-GCM (got %d bytes)", ExpectedGCMIVBytesLength, len(ivBytes))
	}
	if p.Ciphertext == "" {
		return errors.New("ciphertext is required")
	}
	cipherBytes, err := base64.StdEncoding.DecodeString(p.Ciphertext)
	if err != nil {
		return fmt.Errorf("ciphertext must be valid Base64: %w", err)
	}
	if len(cipherBytes) > MaxCiphertextBytesLength {
		return fmt.Errorf("ciphertext exceeds maximum allowed size of %d bytes", MaxCiphertextBytesLength)
	}
	return nil
}

// ValidateWrappedKeyPayload ensures the wrapped key matches AES-GCM standards and Base64 length bounds.
func ValidateWrappedKeyPayload(p WrappedKeyPayload) error {
	if p.Version != ExpectedEncryptionVersion {
		return fmt.Errorf("unsupported encryption version %d (expected %d)", p.Version, ExpectedEncryptionVersion)
	}
	if p.Algorithm != ExpectedEncryptionAlgorithm {
		return fmt.Errorf("unsupported encryption algorithm '%s' (expected '%s')", p.Algorithm, ExpectedEncryptionAlgorithm)
	}
	if p.IV == "" {
		return errors.New("key IV is required")
	}
	ivBytes, err := base64.StdEncoding.DecodeString(p.IV)
	if err != nil {
		return fmt.Errorf("key IV must be valid Base64: %w", err)
	}
	if len(ivBytes) != ExpectedGCMIVBytesLength {
		return fmt.Errorf("invalid key IV length: expected %d bytes for AES-GCM (got %d bytes)", ExpectedGCMIVBytesLength, len(ivBytes))
	}
	if p.WrappedKey == "" {
		return errors.New("wrappedKey is required")
	}
	keyBytes, err := base64.StdEncoding.DecodeString(p.WrappedKey)
	if err != nil {
		return fmt.Errorf("wrappedKey must be valid Base64: %w", err)
	}
	if len(keyBytes) > MaxWrappedKeyBytesLength {
		return fmt.Errorf("wrappedKey exceeds maximum allowed size of %d bytes", MaxWrappedKeyBytesLength)
	}
	return nil
}
