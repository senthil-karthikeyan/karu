package model

import (
	"github.com/gin-gonic/gin"
)

// APIResponse represents standard API envelope for all responses.
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorBody  `json:"error,omitempty"`
}

// ErrorBody represents the error details in the standard error envelope.
type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// SendSuccess sends a standard success response.
func SendSuccess(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Data:    data,
	})
}

// SendError maps the error to an AppError and sends a standard error response.
func SendError(c *gin.Context, err error) {
	appErr := MapErrorToAppError(err)
	c.JSON(appErr.StatusCode, APIResponse{
		Success: false,
		Error: &ErrorBody{
			Code:    appErr.Code,
			Message: appErr.Message,
		},
	})
}
