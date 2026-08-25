package auth

import (
	"errors"
	"net/http"

	"github.com/gorilla/sessions"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/google"

	"backend/internal/config"
)

// OAuthUser represents the normalized profile returned by an OAuth provider.
type OAuthUser struct {
	Provider       string
	ProviderUserID string
	Email          string
	Name           string
	FirstName      string
	LastName       string
	AvatarURL      string
}

// OAuthAuthenticator abstracts the OAuth initiation and callback completion.
type OAuthAuthenticator interface {
	BeginAuth(w http.ResponseWriter, r *http.Request) error
	CompleteAuth(w http.ResponseWriter, r *http.Request) (*OAuthUser, error)
}

type gothAuthenticator struct {
	cfg config.GoogleOAuthConfig
}

// InitGoth sets up Goth session store and registers the Google provider.
func InitGoth(sessionSecret string, googleCfg config.GoogleOAuthConfig) OAuthAuthenticator {
	// Initialize cookie store for OAuth state management
	maxAge := 86400 * 30 // 30 days
	store := sessions.NewCookieStore([]byte(sessionSecret))
	store.MaxAge(maxAge)
	store.Options = &sessions.Options{
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // set to true in HTTPS production
		SameSite: http.SameSiteLaxMode,
	}
	gothic.Store = store

	// Register Google provider if client ID and secret are configured
	if googleCfg.ClientID != "" && googleCfg.ClientSecret != "" {
		goth.UseProviders(
			google.New(
				googleCfg.ClientID,
				googleCfg.ClientSecret,
				googleCfg.RedirectURL,
				"email",
				"profile",
			),
		)
	}

	return &gothAuthenticator{
		cfg: googleCfg,
	}
}

func (a *gothAuthenticator) BeginAuth(w http.ResponseWriter, r *http.Request) error {
	// Ensure provider query param is set for gothic
	q := r.URL.Query()
	if q.Get("provider") == "" {
		q.Set("provider", "google")
		r.URL.RawQuery = q.Encode()
	}

	gothic.BeginAuthHandler(w, r)
	return nil
}

func (a *gothAuthenticator) CompleteAuth(w http.ResponseWriter, r *http.Request) (*OAuthUser, error) {
	q := r.URL.Query()
	if q.Get("provider") == "" {
		q.Set("provider", "google")
		r.URL.RawQuery = q.Encode()
	}

	gothUser, err := gothic.CompleteUserAuth(w, r)
	if err != nil {
		return nil, err
	}

	if gothUser.UserID == "" {
		return nil, errors.New("missing provider user ID from OAuth provider")
	}

	name := gothUser.Name
	if name == "" {
		name = gothUser.FirstName + " " + gothUser.LastName
	}

	return &OAuthUser{
		Provider:       "google",
		ProviderUserID: gothUser.UserID,
		Email:          gothUser.Email,
		Name:           name,
		FirstName:      gothUser.FirstName,
		LastName:       gothUser.LastName,
		AvatarURL:      gothUser.AvatarURL,
	}, nil
}

// MockOAuthAuthenticator provides a mock for testing OAuth flows without network requests.
type MockOAuthAuthenticator struct {
	BeginAuthFunc    func(w http.ResponseWriter, r *http.Request) error
	CompleteAuthFunc func(w http.ResponseWriter, r *http.Request) (*OAuthUser, error)
}

func (m *MockOAuthAuthenticator) BeginAuth(w http.ResponseWriter, r *http.Request) error {
	if m.BeginAuthFunc != nil {
		return m.BeginAuthFunc(w, r)
	}
	w.WriteHeader(http.StatusTemporaryRedirect)
	return nil
}

func (m *MockOAuthAuthenticator) CompleteAuth(w http.ResponseWriter, r *http.Request) (*OAuthUser, error) {
	if m.CompleteAuthFunc != nil {
		return m.CompleteAuthFunc(w, r)
	}
	return nil, errors.New("mock complete auth not implemented")
}

// Ensure interface satisfaction
var _ OAuthAuthenticator = (*gothAuthenticator)(nil)
var _ OAuthAuthenticator = (*MockOAuthAuthenticator)(nil)
