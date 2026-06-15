package database

import (
	"context"
	"fmt"
	"log"
	"strconv"

	"github.com/dangkychi/GOLingo/internal/config"
	"github.com/redis/go-redis/v9"
)

func NewRedisClient(cfg config.RedisConfig) (*redis.Client, error) {
	db, _ := strconv.Atoi(cfg.DB)

	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr(),
		Password: cfg.Password,
		DB:       db,
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("✓ Connected to Redis")
	return client, nil
}
