package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/internal/database"
)

type HealthHandler struct {
	db database.Service
}

func NewHealthHandler(db database.Service) *HealthHandler {
	return &HealthHandler{
		db: db,
	}
}

// Health verifies the process is running.
func (h *HealthHandler) Health(c *gin.Context) {
	healthStats := h.db.Health(c.Request.Context())
	c.JSON(http.StatusOK, healthStats)
}

// Ready verifies that database and dependencies are available.
func (h *HealthHandler) Ready(c *gin.Context) {
	if err := h.db.Ready(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unavailable",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "ready",
		"message": "Service is ready to handle traffic",
	})
}
