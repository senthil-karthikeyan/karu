package model

import (
	"encoding/base64"
	"strings"
	"testing"
)

func TestValidateSalt(t *testing.T) {
	// Valid Base64 16 bytes
	validSalt := base64.StdEncoding.EncodeToString([]byte("1234567890123456"))
	if err := ValidateSalt(validSalt); err != nil {
		t.Errorf("expected valid salt to pass, got: %v", err)
	}

	// Empty salt
	if err := ValidateSalt(""); err == nil {
		t.Errorf("expected empty salt to fail")
	}

	// Not base64
	if err := ValidateSalt("%%%invalid-base64%%%"); err == nil {
		t.Errorf("expected non-base64 salt to fail")
	}

	// Too short (< 8 bytes)
	shortSalt := base64.StdEncoding.EncodeToString([]byte("short"))
	if err := ValidateSalt(shortSalt); err == nil || !strings.Contains(err.Error(), "bytes") {
		t.Errorf("expected short salt to fail with byte count error, got: %v", err)
	}

	// Too long (> 64 bytes)
	longSalt := base64.StdEncoding.EncodeToString(make([]byte, 100))
	if err := ValidateSalt(longSalt); err == nil || !strings.Contains(err.Error(), "bytes") {
		t.Errorf("expected long salt to fail with byte count error, got: %v", err)
	}
}

func TestValidateEncryptedPayload(t *testing.T) {
	validIV := base64.StdEncoding.EncodeToString([]byte("123456789012")) // 12 bytes
	validCiphertext := base64.StdEncoding.EncodeToString([]byte("test-ciphertext-bytes"))

	validPayload := EncryptedPayload{
		Version:    1,
		Algorithm:  "AES-GCM",
		IV:         validIV,
		Ciphertext: validCiphertext,
	}

	if err := ValidateEncryptedPayload(validPayload); err != nil {
		t.Errorf("expected valid payload to pass, got: %v", err)
	}

	// Invalid version
	badVer := validPayload
	badVer.Version = 2
	if err := ValidateEncryptedPayload(badVer); err == nil || !strings.Contains(err.Error(), "version") {
		t.Errorf("expected version error, got: %v", err)
	}

	// Invalid algorithm
	badAlgo := validPayload
	badAlgo.Algorithm = "AES-CBC"
	if err := ValidateEncryptedPayload(badAlgo); err == nil || !strings.Contains(err.Error(), "algorithm") {
		t.Errorf("expected algorithm error, got: %v", err)
	}

	// Bad IV length (16 bytes instead of 12)
	badIV := validPayload
	badIV.IV = base64.StdEncoding.EncodeToString([]byte("1234567890123456"))
	if err := ValidateEncryptedPayload(badIV); err == nil || !strings.Contains(err.Error(), "12 bytes") {
		t.Errorf("expected 12 bytes IV error, got: %v", err)
	}

	// Missing ciphertext
	noCipher := validPayload
	noCipher.Ciphertext = ""
	if err := ValidateEncryptedPayload(noCipher); err == nil {
		t.Errorf("expected empty ciphertext error")
	}
}

func TestValidateWrappedKeyPayload(t *testing.T) {
	validIV := base64.StdEncoding.EncodeToString([]byte("123456789012")) // 12 bytes
	validKey := base64.StdEncoding.EncodeToString([]byte("32-bytes-wrapped-key-payload-data"))

	validKeyPayload := WrappedKeyPayload{
		Version:    1,
		Algorithm:  "AES-GCM",
		IV:         validIV,
		WrappedKey: validKey,
	}

	if err := ValidateWrappedKeyPayload(validKeyPayload); err != nil {
		t.Errorf("expected valid wrapped key payload to pass, got: %v", err)
	}

	// Invalid version
	badVer := validKeyPayload
	badVer.Version = 0
	if err := ValidateWrappedKeyPayload(badVer); err == nil {
		t.Errorf("expected version error")
	}

	// Invalid algorithm
	badAlgo := validKeyPayload
	badAlgo.Algorithm = "ChaCha20"
	if err := ValidateWrappedKeyPayload(badAlgo); err == nil {
		t.Errorf("expected algorithm error")
	}

	// Invalid IV (empty)
	badIV := validKeyPayload
	badIV.IV = ""
	if err := ValidateWrappedKeyPayload(badIV); err == nil {
		t.Errorf("expected empty IV error")
	}

	// Missing wrapped key
	noKey := validKeyPayload
	noKey.WrappedKey = ""
	if err := ValidateWrappedKeyPayload(noKey); err == nil {
		t.Errorf("expected empty wrapped key error")
	}
}
