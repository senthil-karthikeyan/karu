FROM golang:1.27-alpine AS build

WORKDIR /app

# Copy the Go module files
COPY go.mod .
COPY go.sum .


# Download the Go module dependencies
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server cmd/api/main.go

FROM alpine:3.20 AS prod

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

COPY --from=build /app/server /app/server
COPY --from=build /app/db/migrations /app/db/migrations

EXPOSE 8080

CMD ["/app/server"]