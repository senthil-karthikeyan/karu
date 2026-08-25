package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RootHandler handles GET / returning API metadata.
func RootHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"app":     "Karu API",
		"version": "1.0.0",
		"status":  "running",
	})
}
