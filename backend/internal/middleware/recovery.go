package middleware

import (
	"log"
	"runtime/debug"

	"github.com/gin-gonic/gin"

	"backend/internal/model"
)

// Recovery catches any panics and responds with a safe 500 error envelope.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[PANIC RECOVERED] %v\nStack: %s", r, string(debug.Stack()))
				model.SendError(c, model.ErrInternal)
				c.Abort()
			}
		}()
		c.Next()
	}
}
