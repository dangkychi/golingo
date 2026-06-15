package logger

import (
	"os"
	"path/filepath"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger

// InitLogger initializes a Zap logger that writes to both console and a file.
func InitLogger(env string, logFilePath string) (*zap.Logger, error) {
	var config zapcore.EncoderConfig
	var level zapcore.Level

	if env == "production" {
		config = zap.NewProductionEncoderConfig()
		level = zap.InfoLevel
	} else {
		config = zap.NewDevelopmentEncoderConfig()
		level = zap.DebugLevel
	}

	config.EncodeTime = zapcore.ISO8601TimeEncoder
	config.EncodeLevel = zapcore.CapitalColorLevelEncoder // Colored log levels for console

	// Core list
	var cores []zapcore.Core

	// Console Core
	consoleEncoder := zapcore.NewConsoleEncoder(config)
	consoleCore := zapcore.NewCore(consoleEncoder, zapcore.Lock(os.Stdout), level)
	cores = append(cores, consoleCore)

	// File Core (if file path is provided)
	if logFilePath != "" {
		// Ensure directory exists
		dir := filepath.Dir(logFilePath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, err
		}

		// Open log file
		file, err := os.OpenFile(logFilePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			return nil, err
		}

		// File config should not use color codes
		fileConfig := config
		if env != "production" {
			fileConfig.EncodeLevel = zapcore.CapitalLevelEncoder
		}
		fileEncoder := zapcore.NewJSONEncoder(fileConfig)
		fileCore := zapcore.NewCore(fileEncoder, zapcore.Lock(file), level)
		cores = append(cores, fileCore)
	}

	// Combine cores
	combinedCore := zapcore.NewTee(cores...)

	Log = zap.New(combinedCore, zap.AddCaller())
	zap.ReplaceGlobals(Log)

	return Log, nil
}
