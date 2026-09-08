package model

import (
	"encoding/base64"
	"encoding/json"
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

// UserEncryptionKeysResponse represents the consolidated user encryption keys record.
type UserEncryptionKeysResponse struct {
	UserID              uuid.UUID `json:"userId"`
	Salt                string    `json:"salt"`
	Iterations          int       `json:"iterations"`
	HashAlgorithm       string    `json:"hashAlgorithm"`
	PublicKey           *string   `json:"publicKey,omitempty"`
	EncryptedPrivateKey *string   `json:"encryptedPrivateKey,omitempty"`
	KeyIV               *string   `json:"keyIv,omitempty"`
	Algorithm           string    `json:"algorithm"`
	Version             int       `json:"version"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

// UserEncryptionKeysRequest is sent when configuring or updating the complete user encryption keys.
type UserEncryptionKeysRequest struct {
	Salt                string  `json:"salt" binding:"required"`
	Iterations          int     `json:"iterations"`
	HashAlgorithm       string  `json:"hashAlgorithm"`
	PublicKey           *string `json:"publicKey,omitempty"`
	EncryptedPrivateKey *string `json:"encryptedPrivateKey,omitempty"`
	KeyIV               *string `json:"keyIv,omitempty"`
	Algorithm           string  `json:"algorithm"`
	Version             int     `json:"version"`
}

// UserRecoveryCredentialResponse represents a stored recovery credential (recovery key or passphrase).
type UserRecoveryCredentialResponse struct {
	UserID                   uuid.UUID `json:"userId"`
	CredentialType           string    `json:"credentialType"`
	Salt                     string    `json:"salt"`
	Iterations               int       `json:"iterations"`
	HashAlgorithm            string    `json:"hashAlgorithm"`
	DoubleWrappedDEK         *string   `json:"doubleWrappedDek,omitempty"`
	DoubleWrappedPrivateKey  *string   `json:"doubleWrappedPrivateKey,omitempty"`
	KeyIV                    string    `json:"keyIv"`
	Version                  int       `json:"version"`
	CreatedAt                time.Time `json:"createdAt"`
	UpdatedAt                time.Time `json:"updatedAt"`
}

// UserRecoveryCredentialRequest is sent when enrolling or updating a recovery credential.
type UserRecoveryCredentialRequest struct {
	CredentialType          string  `json:"credentialType" binding:"required"`
	Salt                    string  `json:"salt" binding:"required"`
	Iterations              int     `json:"iterations"`
	HashAlgorithm           string  `json:"hashAlgorithm"`
	DoubleWrappedDEK        *string `json:"doubleWrappedDek,omitempty"`
	DoubleWrappedPrivateKey *string `json:"doubleWrappedPrivateKey,omitempty"`
	KeyIV                   string  `json:"keyIv" binding:"required"`
	Version                 int     `json:"version"`
}

// EncryptedPayload represents the versioned AES-GCM ciphertext payload produced by Web Crypto.
type EncryptedPayload struct {
	Version    int    `json:"version"`
	Algorithm  string `json:"algorithm"`
	IV         string `json:"iv"`         // Base64 encoded 12-byte IV
	Ciphertext string `json:"ciphertext"` // Base64 encoded ciphertext + GCM auth tag
}

// WrappedKeyPayload represents generic wrapped key material.
type WrappedKeyPayload struct {
	Version    int    `json:"version"`
	Algorithm  string `json:"algorithm"`
	IV         string `json:"iv"`         // Base64 encoded 12-byte IV
	WrappedKey string `json:"wrappedKey"` // Base64 encoded wrapped key bytes
}

// ECIESWrappedKeyPayload represents an SCK wrapped for a recipient using ECDH ephemeral keypair and AES-256-GCM.
type ECIESWrappedKeyPayload struct {
	Version            int    `json:"version"`
	Algorithm          string `json:"algorithm"`          // "ECIES-P256-AES-GCM"
	EphemeralPublicKey string `json:"ephemeralPublicKey"` // Base64 SPKI
	IV                 string `json:"iv"`                 // Base64 12-byte IV
	WrappedKey         string `json:"wrappedKey"`         // Base64 ciphertext
}

// ScreenplayKeyResponse is returned when retrieving a wrapped key for a screenplay.
type ScreenplayKeyResponse struct {
	ScreenplayID       uuid.UUID  `json:"screenplayId"`
	Version            int        `json:"version"`
	Algorithm          string     `json:"algorithm"`
	IV                 string     `json:"iv"`
	WrappedKey         string     `json:"wrappedKey"`
	Role               string     `json:"role,omitempty"`
	EphemeralPublicKey *string    `json:"ephemeralPublicKey,omitempty"`
	GrantedBy          *uuid.UUID `json:"grantedBy,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
}

// ScreenplayAccessKeyResponse represents an access key grant in screenplay_access_keys.
type ScreenplayAccessKeyResponse struct {
	ID                 uuid.UUID  `json:"id"`
	ScreenplayID       uuid.UUID  `json:"screenplayId"`
	UserID             uuid.UUID  `json:"userId"`
	Role               string     `json:"role"`
	EphemeralPublicKey *string    `json:"ephemeralPublicKey,omitempty"`
	KeyIV              string     `json:"keyIv"`
	WrappedKey         string     `json:"wrappedKey"`
	Version            int        `json:"version"`
	Algorithm          string     `json:"algorithm"`
	GrantedBy          *uuid.UUID `json:"grantedBy,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
}

// ScreenplayAccessKeyRequest is sent when granting or updating access to a screenplay.
type ScreenplayAccessKeyRequest struct {
	ScreenplayID       uuid.UUID `json:"screenplayId"`
	UserID             uuid.UUID `json:"userId" binding:"required"`
	Role               string    `json:"role"`
	EphemeralPublicKey *string   `json:"ephemeralPublicKey,omitempty"`
	KeyIV              string    `json:"keyIv" binding:"required"`
	WrappedKey         string    `json:"wrappedKey" binding:"required"`
	Version            int       `json:"version"`
	Algorithm          string    `json:"algorithm"`
}

// ScreenplayCollaboratorResponse represents a collaborator on a screenplay.
type ScreenplayCollaboratorResponse struct {
	UserID    uuid.UUID  `json:"userId"`
	Email     string     `json:"email"`
	Name      string     `json:"name"`
	Role      string     `json:"role"`
	GrantedBy *uuid.UUID `json:"grantedBy,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// ShareScreenplayRequest represents a request to share a screenplay with a recipient.
type ShareScreenplayRequest struct {
	RecipientUserID    uuid.UUID `json:"recipientUserId" binding:"required"`
	Role               string    `json:"role" binding:"required"` // "editor" or "viewer"
	EphemeralPublicKey string    `json:"ephemeralPublicKey" binding:"required"`
	KeyIV              string    `json:"keyIv" binding:"required"`
	WrappedKey         string    `json:"wrappedKey" binding:"required"`
	Algorithm          string    `json:"algorithm"`
	Version            int       `json:"version"`
}

// RecoveryLookupRequest is used to lookup recovery parameters for an email.
type RecoveryLookupRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// RecoveryLookupResponse provides recovery salt/PBKDF2 info and double-wrapped DEK.
type RecoveryLookupResponse struct {
	UserID                   uuid.UUID `json:"userId"`
	CredentialType           string    `json:"credentialType"`
	Salt                     string    `json:"salt"`
	Iterations               int       `json:"iterations"`
	HashAlgorithm            string    `json:"hashAlgorithm"`
	DoubleWrappedDEK         *string   `json:"doubleWrappedDek,omitempty"`
	DoubleWrappedPrivateKey  *string   `json:"doubleWrappedPrivateKey,omitempty"`
	KeyIV                    string    `json:"keyIv"`
	Version                  int       `json:"version"`
}

// RecoveryResetRequest is used to reset credentials using a recovery secret.
type RecoveryResetRequest struct {
	Email                string                    `json:"email" binding:"required,email"`
	CredentialType       string                    `json:"credentialType" binding:"required"`
	NewEncryptionKeys    UserEncryptionKeysRequest `json:"newEncryptionKeys" binding:"required"`
	NewRecoveryCredential *UserRecoveryCredentialRequest `json:"newRecoveryCredential,omitempty"`
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

// UserEncryptionIdentityRequest is sent when setting or updating the user's asymmetric identity keypair.
type UserEncryptionIdentityRequest struct {
	PublicKey           string `json:"publicKey" binding:"required"`
	EncryptedPrivateKey string `json:"encryptedPrivateKey" binding:"required"`
	KeyIV               string `json:"keyIv" binding:"required"`
	Algorithm           string `json:"algorithm"`
	Version             int    `json:"version"`
}

// UserPublicKeyResponse represents the public key export of a user for sharing.
type UserPublicKeyResponse struct {
	UserID    uuid.UUID `json:"userId"`
	PublicKey string    `json:"publicKey"`
	Algorithm string    `json:"algorithm"`
	Version   int       `json:"version"`
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

// ValidateUserEncryptionIdentityRequest ensures public key and wrapped private key conform to size and Base64 constraints.
func ValidateUserEncryptionIdentityRequest(r UserEncryptionIdentityRequest) error {
	if r.PublicKey == "" {
		return errors.New("publicKey is required")
	}
	pubBytes, err := base64.StdEncoding.DecodeString(r.PublicKey)
	if err != nil {
		return fmt.Errorf("publicKey must be valid Base64: %w", err)
	}
	if len(pubBytes) > MaxPublicKeyBytesLength {
		return fmt.Errorf("publicKey exceeds maximum allowed size of %d bytes", MaxPublicKeyBytesLength)
	}

	if r.EncryptedPrivateKey == "" {
		return errors.New("encryptedPrivateKey is required")
	}
	privBytes, err := base64.StdEncoding.DecodeString(r.EncryptedPrivateKey)
	if err != nil {
		return fmt.Errorf("encryptedPrivateKey must be valid Base64: %w", err)
	}
	if len(privBytes) > MaxWrappedKeyBytesLength {
		return fmt.Errorf("encryptedPrivateKey exceeds maximum allowed size of %d bytes", MaxWrappedKeyBytesLength)
	}

	if r.KeyIV == "" {
		return errors.New("keyIv is required")
	}
	ivBytes, err := base64.StdEncoding.DecodeString(r.KeyIV)
	if err != nil {
		return fmt.Errorf("keyIv must be valid Base64: %w", err)
	}
	if len(ivBytes) != ExpectedGCMIVBytesLength {
		return fmt.Errorf("invalid keyIv length: expected %d bytes (got %d bytes)", ExpectedGCMIVBytesLength, len(ivBytes))
	}

	return nil
}

// ParseEncryptedPayloadString attempts to deserialize a JSON string into an EncryptedPayload.
// Returns the parsed payload and true if successful and valid, or nil and false otherwise.
func ParseEncryptedPayloadString(s string) (*EncryptedPayload, bool) {
	if s == "" {
		return nil, false
	}
	var payload EncryptedPayload
	if err := json.Unmarshal([]byte(s), &payload); err != nil {
		return nil, false
	}
	if payload.Ciphertext == "" || payload.IV == "" {
		return nil, false
	}
	return &payload, true
}
