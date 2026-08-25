package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger logs HTTP request details.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		reqID := c.GetString(HeaderXRequestID)

		if raw != "" {
			path = path + "?" + raw
		}

		log.Printf("[%s] %3d | %12v | %15s | %-7s %s",
			reqID,
			statusCode,
			latency,
			clientIP,
			method,
			path,
		)
	}
}
