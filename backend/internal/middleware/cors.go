package middleware

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"backend/internal/config"
)

// CORS creates a CORS middleware configured with allowed origins.
func CORS(cfg config.CORSConfig) gin.HandlerFunc {
	corsConfig := cors.DefaultConfig()

	if len(cfg.AllowedOrigins) > 0 {
		corsConfig.AllowOrigins = cfg.AllowedOrigins
	} else {
		corsConfig.AllowAllOrigins = true
	}

	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "Origin"}
	corsConfig.ExposeHeaders = []string{"Content-Length", "X-Request-ID"}
	corsConfig.AllowCredentials = true

	return cors.New(corsConfig)
}
