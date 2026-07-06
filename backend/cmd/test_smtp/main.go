package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	fmt.Println("=== GOLingo SMTP Test Tool ===")

	// Load env
	err := godotenv.Load("../.env")
	if err != nil {
		err = godotenv.Load(".env")
	}
	if err != nil {
		fmt.Println("Warning: Could not load .env file, reading direct environment variables.")
	}

	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	username := os.Getenv("SMTP_USERNAME")
	password := os.Getenv("SMTP_PASSWORD")
	sender := os.Getenv("SMTP_SENDER")

	fmt.Printf("SMTP Host: %s\n", host)
	fmt.Printf("SMTP Port: %s\n", portStr)
	fmt.Printf("SMTP Username: %s\n", username)
	fmt.Printf("SMTP Sender: %s\n", sender)
	if password == "" {
		fmt.Println("SMTP Password: (Empty)")
	} else {
		fmt.Printf("SMTP Password length: %d chars\n", len(password))
	}

	if host == "" || portStr == "" {
		log.Fatal("Error: SMTP_HOST and SMTP_PORT must be configured in .env")
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		log.Fatalf("Error parsing SMTP_PORT: %v", err)
	}

	addr := fmt.Sprintf("%s:%d", host, port)
	fmt.Printf("\n1. Connecting to %s...\n", addr)
	client, err := smtp.Dial(addr)
	if err != nil {
		log.Fatalf("Failed to connect to SMTP server: %v", err)
	}
	defer client.Close()
	fmt.Println("✓ Connected successfully.")

	// For port 587, we perform STARTTLS
	var tlsConfig *tls.Config
	if port == 587 {
		fmt.Println("\n2. Initiating STARTTLS handshake...")
		tlsConfig = &tls.Config{
			ServerName: host,
		}
		if err := client.StartTLS(tlsConfig); err != nil {
			log.Fatalf("STARTTLS handshake failed: %v", err)
		}
		fmt.Println("✓ STARTTLS handshake completed (secure connection established).")
	}

	if username != "" && password != "" {
		fmt.Println("\n3. Authenticating...")
		auth := smtp.PlainAuth("", username, password, host)
		if err := client.Auth(auth); err != nil {
			fmt.Printf("Authentication failed: %v\n", err)
			fmt.Println("Trying authentication with password spaces stripped...")
			// Gmail passwords usually omit spaces, let's see if stripping works
			strippedPassword := ""
			for _, r := range password {
				if r != ' ' {
					strippedPassword += string(r)
				}
			}
			if strippedPassword != password {
				fmt.Printf("Stripped password length: %d chars. Retrying...\n", len(strippedPassword))
				// Reconnect since previous auth error might have closed or invalidated the session state
				client.Close()
				client2, err := smtp.Dial(addr)
				if err != nil {
					log.Fatalf("Failed to reconnect: %v", err)
				}
				defer client2.Close()
				if port == 587 {
					if err := client2.StartTLS(tlsConfig); err != nil {
						log.Fatalf("STARTTLS reconnect failed: %v", err)
					}
				}
				auth2 := smtp.PlainAuth("", username, strippedPassword, host)
				if err := client2.Auth(auth2); err != nil {
					log.Fatalf("Authentication with stripped password also failed: %v", err)
				}
				client = client2
				fmt.Println("✓ Authentication succeeded with stripped spaces!")
			} else {
				log.Fatalf("Authentication failed: %v", err)
			}
		} else {
			fmt.Println("✓ Authentication succeeded.")
		}
	}

	fmt.Println("\n4. Sending test email...")
	envelopeSender := sender
	if envelopeSender == "" {
		envelopeSender = username
	}

	fromHeader := ""
	if !strings.Contains(envelopeSender, "<") {
		fromHeader = fmt.Sprintf("From: GOLingo <%s>\r\n", envelopeSender)
	} else {
		fromHeader = fmt.Sprintf("From: %s\r\n", envelopeSender)
		// Extract raw email for SMTP envelop from "Name <email>" format
		if start, end := strings.Index(envelopeSender, "<"), strings.Index(envelopeSender, ">"); start != -1 && end != -1 && start < end {
			envelopeSender = envelopeSender[start+1 : end]
		}
	}

	recipient := username // Send to self for testing
	if recipient == "" {
		recipient = "test@example.com"
	}

	if err := client.Mail(envelopeSender); err != nil {
		log.Fatalf("Mail command failed: %v", err)
	}
	if err := client.Rcpt(recipient); err != nil {
		log.Fatalf("Rcpt command failed: %v", err)
	}

	w, err := client.Data()
	if err != nil {
		log.Fatalf("Data command failed: %v", err)
	}

	msg := fmt.Sprintf("Subject: GOLingo SMTP Test\r\n"+
		"To: %s\r\n"+
		"%s"+
		"Content-Type: text/plain; charset=UTF-8\r\n"+
		"\r\n"+
		"This is a test email from the GOLingo SMTP diagnosis tool. If you received this, your SMTP settings are 100%% working!\r\n", recipient, fromHeader)

	_, err = w.Write([]byte(msg))
	if err != nil {
		log.Fatalf("Failed to write message body: %v", err)
	}

	err = w.Close()
	if err != nil {
		log.Fatalf("Failed to close data writer: %v", err)
	}

	fmt.Println("✓ Mail sent successfully!")
	fmt.Println("\n=== Test complete: SUCCESS! ===")
}
