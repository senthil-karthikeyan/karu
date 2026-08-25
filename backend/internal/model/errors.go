package model

import (
	"errors"
	"fmt"
	"net/http"
)

var (
	ErrNotFound           = errors.New("resource not found")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrForbidden          = errors.New("access forbidden")
	ErrConflict           = errors.New("resource conflict")
	ErrRevisionConflict   = errors.New("document revision conflict: client revision is outdated")
	ErrEmailAlreadyExists = errors.New("email already registered")
	ErrBadRequest         = errors.New("invalid request payload")
	ErrInternal           = errors.New("internal server error")
)

type AppError struct {
	Code       string      `json:"code"`
	Message    string      `json:"message"`
	StatusCode int         `json:"-"`
	Data       interface{} `json:"data,omitempty"`
	Err        error       `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func NewAppError(code string, message string, statusCode int, err error) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
		Err:        err,
	}
}

func MapErrorToAppError(err error) *AppError {
	if err == nil {
		return nil
	}

	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr
	}

	switch {
	case errors.Is(err, ErrNotFound):
		return &AppError{
			Code:       "RESOURCE_NOT_FOUND",
			Message:    "The requested resource was not found.",
			StatusCode: http.StatusNotFound,
			Err:        err,
		}
	case errors.Is(err, ErrInvalidCredentials):
		return &AppError{
			Code:       "INVALID_CREDENTIALS",
			Message:    "Invalid email or password.",
			StatusCode: http.StatusUnauthorized,
			Err:        err,
		}
	case errors.Is(err, ErrUnauthorized):
		return &AppError{
			Code:       "UNAUTHORIZED",
			Message:    "Authentication credentials are missing, invalid, or expired.",
			StatusCode: http.StatusUnauthorized,
			Err:        err,
		}
	case errors.Is(err, ErrForbidden):
		return &AppError{
			Code:       "FORBIDDEN",
			Message:    "You do not have permission to access this resource.",
			StatusCode: http.StatusForbidden,
			Err:        err,
		}
	case errors.Is(err, ErrEmailAlreadyExists):
		return &AppError{
			Code:       "EMAIL_ALREADY_EXISTS",
			Message:    "An account with this email address already exists.",
			StatusCode: http.StatusConflict,
			Err:        err,
		}
	case errors.Is(err, ErrRevisionConflict):
		return &AppError{
			Code:       "REVISION_CONFLICT",
			Message:    "The document was updated by another session. Please refresh the latest content.",
			StatusCode: http.StatusConflict,
			Err:        err,
		}
	case errors.Is(err, ErrConflict):
		return &AppError{
			Code:       "CONFLICT",
			Message:    "The operation conflicts with existing state.",
			StatusCode: http.StatusConflict,
			Err:        err,
		}
	case errors.Is(err, ErrBadRequest):
		return &AppError{
			Code:       "BAD_REQUEST",
			Message:    "Invalid request parameters or payload.",
			StatusCode: http.StatusBadRequest,
			Err:        err,
		}
	default:
		return &AppError{
			Code:       "INTERNAL_SERVER_ERROR",
			Message:    "An unexpected internal error occurred.",
			StatusCode: http.StatusInternalServerError,
			Err:        err,
		}
	}
}
