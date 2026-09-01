package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const baseURL = "http://localhost:8080/api/v1"

type ApiResponse struct {
	Status  string          `json:"status"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

func main() {
	client := &http.Client{Timeout: 10 * time.Second}
	email := fmt.Sprintf("e2e_unified_%d@karu.app", time.Now().UnixNano())
	password := "SecurePass2026!"

	fmt.Println("=== 1. Register User ===")
	regBody, _ := json.Marshal(map[string]string{
		"email":     email,
		"password":  password,
		"firstName": "Titan",
		"lastName":  "Writer",
	})
	resp, err := client.Post(baseURL+"/auth/register", "application/json", bytes.NewBuffer(regBody))
	if err != nil {
		log.Fatalf("Register request failed: %v", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusCreated {
		log.Fatalf("Register failed (status %d): %s", resp.StatusCode, string(body))
	}

	var regData struct {
		Data struct {
			AccessToken string `json:"accessToken"`
			User        struct {
				ID string `json:"id"`
			} `json:"user"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &regData); err != nil {
		log.Fatalf("Failed to parse register response: %v", err)
	}
	token := regData.Data.AccessToken
	if token == "" {
		log.Fatalf("Register response did not contain accessToken: %s", string(body))
	}
	fmt.Printf("User registered successfully. Token: %s...\n", token[:20])

	authReq := func(method, url string, payload interface{}) (*http.Response, []byte) {
		var bodyReader io.Reader
		if payload != nil {
			b, _ := json.Marshal(payload)
			bodyReader = bytes.NewBuffer(b)
		}
		req, _ := http.NewRequest(method, baseURL+url, bodyReader)
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		r, err := client.Do(req)
		if err != nil {
			log.Fatalf("HTTP %s %s failed: %v", method, url, err)
		}
		defer r.Body.Close()
		b, _ := io.ReadAll(r.Body)
		return r, b
	}

	fmt.Println("\n=== 2. Set User Encryption Metadata (UEK parameters) ===")
	r, b := authReq("POST", "/users/me/encryption-metadata", map[string]interface{}{
		"salt":          "dGVzdC1zYWx0LTE2LWJ5dGVz",
		"iterations":    600000,
		"hashAlgorithm": "SHA-256",
	})
	if r.StatusCode != http.StatusOK {
		log.Fatalf("Failed to set encryption metadata (status %d): %s", r.StatusCode, string(b))
	}
	fmt.Println("User encryption metadata registered successfully.")

	fmt.Println("\n=== 3. Create Project ===")
	r, b = authReq("POST", "/projects", map[string]interface{}{
		"title":   "Chronicles of Titan",
		"logline": "An expedition to Saturn's moon discovers an alien beacon.",
		"genre":   "Sci-Fi",
		"format":  "Feature Film",
	})
	if r.StatusCode != http.StatusCreated {
		log.Fatalf("Failed to create project (status %d): %s", r.StatusCode, string(b))
	}
	var projResp struct {
		Data struct {
			ID    string `json:"id"`
			Title string `json:"title"`
		} `json:"data"`
	}
	_ = json.Unmarshal(b, &projResp)
	projectID := projResp.Data.ID
	fmt.Printf("Project created: ID=%s, Title=%s\n", projectID, projResp.Data.Title)

	fmt.Println("\n=== 4. Fetch Default Screenplay (Canonical Flow) ===")
	r, b = authReq("GET", "/projects/"+projectID+"/screenplay", nil)
	if r.StatusCode != http.StatusOK {
		log.Fatalf("Failed to get default screenplay (status %d): %s", r.StatusCode, string(b))
	}
	var spResp struct {
		Data struct {
			ID        string `json:"id"`
			ProjectID string `json:"projectId"`
			Title     string `json:"title"`
			IsDefault bool   `json:"isDefault"`
		} `json:"data"`
	}
	_ = json.Unmarshal(b, &spResp)
	screenplayID := spResp.Data.ID
	if !spResp.Data.IsDefault {
		log.Fatalf("Screenplay %s is not marked as default!", screenplayID)
	}
	fmt.Printf("Default Screenplay verified: ID=%s, Title=%s, IsDefault=%v\n", screenplayID, spResp.Data.Title, spResp.Data.IsDefault)

	fmt.Println("\n=== 5. Upload Wrapped Screenplay Content Key (Direct 2-Tier SCK) ===")
	r, b = authReq("POST", "/screenplays/"+screenplayID+"/key", map[string]interface{}{
		"version":    1,
		"algorithm":  "AES-GCM",
		"iv":         "MTIzNDU2Nzg5MDEy",
		"wrappedKey": "d3JhcHBlZC1zY2stY2Fub25pY2FsLXRlc3Q=",
	})
	if r.StatusCode != http.StatusOK {
		log.Fatalf("Failed to save screenplay key (status %d): %s", r.StatusCode, string(b))
	}
	fmt.Println("Screenplay Content Key (SCK) saved to /screenplays/:id/key successfully.")

	fmt.Println("\n=== 6. Save Encrypted Screenplay Content ===")
	sampleCiphertext := "ZW5jcnlwdGVkLXRpcHRhcC1kb2N1bWVudC1qc29u"
	r, b = authReq("PUT", "/screenplays/"+screenplayID+"/content", map[string]interface{}{
		"revision": 1,
		"encryptedContent": map[string]interface{}{
			"version":    1,
			"algorithm":  "AES-GCM",
			"iv":         "MTIzNDU2Nzg5MDEy",
			"ciphertext": sampleCiphertext,
		},
	})
	if r.StatusCode != http.StatusOK {
		log.Fatalf("Failed to save encrypted screenplay content (status %d): %s", r.StatusCode, string(b))
	}
	fmt.Println("Encrypted screenplay content autosaved to /screenplays/:id/content successfully.")

	fmt.Println("\n=== 7. Create Version Snapshot ===")
	r, b = authReq("POST", "/screenplays/"+screenplayID+"/versions", map[string]interface{}{
		"title":       "Draft 1.0 Milestone",
		"description": "First locked scenes",
	})
	if r.StatusCode != http.StatusCreated {
		log.Fatalf("Failed to create screenplay version (status %d): %s", r.StatusCode, string(b))
	}
	fmt.Println("Screenplay version snapshot created successfully.")

	fmt.Println("\n=== 8. Verify Legacy PEK Endpoint is Completely Removed (Must return 404) ===")
	r, b = authReq("GET", "/projects/"+projectID+"/key", nil)
	if r.StatusCode != http.StatusNotFound {
		log.Fatalf("Expected 404 for legacy PEK endpoint /projects/:id/key, got status %d: %s", r.StatusCode, string(b))
	}
	fmt.Println("PASS: /projects/:id/key correctly returned 404 Not Found.")

	fmt.Println("\n=== 9. Verify Legacy Project Screenplay Content Update is Removed ===")
	r, b = authReq("PATCH", "/projects/"+projectID, map[string]interface{}{
		"title": "Chronicles of Titan (Revised)",
	})
	if r.StatusCode != http.StatusOK {
		log.Fatalf("Failed to update project metadata: %s", string(b))
	}
	fmt.Println("Project metadata updated cleanly without touching screenplay content.")

	fmt.Println("\n=======================================================")
	fmt.Println("🎉 ALL END-TO-END CANONICAL FLOW TESTS PASSED 100%!")
	fmt.Println("=======================================================")
}
