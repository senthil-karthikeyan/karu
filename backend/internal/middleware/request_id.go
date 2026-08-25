package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const HeaderXRequestID = "X-Request-ID"

// RequestID attaches a unique request ID header and context value.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID := c.GetHeader(HeaderXRequestID)
		if reqID == "" {
			reqID = uuid.New().String()
		}
		c.Header(HeaderXRequestID, reqID)
		c.Set(HeaderXRequestID, reqID)
		c.Next()
	}
}
