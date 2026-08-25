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

	// Channel to listen for errors coming from the listener.
	serverErrors := make(chan error, 1)

	// Start the service listening for requests.
	go func() {
		log.Printf("Karu backend server starting on %s", httpServer.Addr)
		serverErrors <- httpServer.ListenAndServe()
	}()

	// Channel to listen for an interrupt or terminate signal from the OS.
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	// Blocking main and waiting for shutdown or error.
	select {
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Error starting server: %v", err)
		}

	case sig := <-shutdown:
		log.Printf("Shutdown signal %v received, commencing graceful shutdown", sig)

		// Give outstanding requests a deadline for completion.
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Asking listener to shut down and shed load.
		if err := httpServer.Shutdown(ctx); err != nil {
			log.Printf("Graceful shutdown did not complete in 10s: %v", err)
			if err := httpServer.Close(); err != nil {
				log.Fatalf("Could not stop http server: %v", err)
			}
		}
	}

	log.Println("Graceful shutdown complete.")
}
