package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/internal/server"
)

func main() {
	httpServer, dbService, err := server.NewServer()
	if err != nil {
		log.Fatalf("Failed to initialize server: %v", err)
	}
	defer dbService.Close()

	serverErrors := make(chan error, 1)

	go func() {
		log.Printf("Karu backend server starting on %s", httpServer.Addr)
		serverErrors <- httpServer.ListenAndServe()
	}()

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	select {
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Error starting server: %v", err)
		}

	case sig := <-shutdown:
		log.Printf("Shutdown signal %v received, commencing graceful shutdown", sig)

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := httpServer.Shutdown(ctx); err != nil {
			log.Printf("Graceful shutdown did not complete in 10s: %v", err)
			if err := httpServer.Close(); err != nil {
				log.Fatalf("Could not stop http server: %v", err)
			}
		}
	}

	log.Println("Graceful shutdown complete.")
}
