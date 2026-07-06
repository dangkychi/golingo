package mail

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/dangkychi/GOLingo/internal/config"
)

type Mailer interface {
	SendResetPasswordEmail(to, token string) error
}

type mailer struct {
	cfg config.SMTPConfig
	fe  config.FrontendConfig
}

func NewMailer(cfg config.SMTPConfig, fe config.FrontendConfig) Mailer {
	return &mailer{
		cfg: cfg,
		fe:  fe,
	}
}

func (m *mailer) SendResetPasswordEmail(to, token string) error {
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", m.fe.URL, token)
	subject := "Reset Password - GOLingo"
	body := fmt.Sprintf(`Hello,

We received a request to reset your password for your GOLingo account.

Please click the link below to set a new password:
%s

This link will expire in 15 minutes.

If you did not request this email, please ignore it.`, resetURL)

	// Fallback to local logs if SMTP is not configured
	if m.cfg.Host == "" {
		return m.writeLocalLog(to, subject, body, resetURL)
	}

	// Prepare From header and parse raw envelope sender email
	fromHeader := ""
	envelopeSender := m.cfg.Sender
	if envelopeSender == "" {
		envelopeSender = m.cfg.Username
	}

	if !strings.Contains(envelopeSender, "<") {
		fromHeader = fmt.Sprintf("From: GOLingo <%s>\r\n", envelopeSender)
	} else {
		fromHeader = fmt.Sprintf("From: %s\r\n", envelopeSender)
		// Extract raw email for SMTP envelop from "Name <email>" format
		if start, end := strings.Index(envelopeSender, "<"), strings.Index(envelopeSender, ">"); start != -1 && end != -1 && start < end {
			envelopeSender = envelopeSender[start+1 : end]
		}
	}

	// Prepare email message
	mime := "MIME-version: 1.0;\r\nContent-Type: text/plain; charset=\"UTF-8\";\r\n\r\n"
	subjectHeader := fmt.Sprintf("Subject: %s\r\n", subject)
	toHeader := fmt.Sprintf("To: %s\r\n", to)
	msg := []byte(fromHeader + toHeader + subjectHeader + mime + body)

	addr := fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)
	var auth smtp.Auth
	if m.cfg.Username != "" && m.cfg.Password != "" {
		auth = smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)
	}

	err := smtp.SendMail(addr, auth, envelopeSender, []string{to}, msg)
	if err != nil {
		log.Printf("[MAIL ERROR] Failed to send email via SMTP: %v. Falling back to log file...", err)
		return m.writeLocalLog(to, subject, body, resetURL)
	}

	log.Printf("[MAIL SUCCESS] Reset password email sent to %s via SMTP", to)
	return nil
}

func (m *mailer) writeLocalLog(to, subject, body, resetURL string) error {
	logDir := "logs"
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}

	logFilePath := filepath.Join(logDir, "email_reset.log")
	f, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open email reset log file: %w", err)
	}
	defer f.Close()

	logContent := fmt.Sprintf(
		"=========================================\nTimestamp: %s\nTo: %s\nSubject: %s\nReset URL: %s\n=========================================\n",
		time.Now().Format(time.RFC3339), to, subject, resetURL,
	)

	if _, err := f.WriteString(logContent); err != nil {
		return fmt.Errorf("failed to write to email reset log file: %w", err)
	}

	log.Printf("\n[MAIL FALLBACK LOG]\nTo: %s\nSubject: %s\nReset URL: %s\n(Check logs/email_reset.log for details)\n", to, subject, resetURL)
	return nil
}
