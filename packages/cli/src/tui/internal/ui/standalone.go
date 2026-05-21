package ui

import (
	"fmt"
	"time"
)

func (m *Model) runStandaloneAgent(prompt string) {
	if prompt == "" {
		return
	}

	if m.streamingSessions == nil {
		m.streamingSessions = make(map[string]*StreamingSession)
	}

	sessionID := "standalone"
	m.streamingSessions[sessionID] = &StreamingSession{
		SessionID: sessionID,
		Buffer:    "",
		Done:      false,
	}

	go func() {
		response := fmt.Sprintf("Standalone response to: %s (simulated)", prompt)
		for _, char := range response {
			m.streamingSessions[sessionID].Buffer += string(char)
			time.Sleep(20 * time.Millisecond)
		}
		m.streamingSessions[sessionID].Done = true

		m.messages = append(m.messages, Message{
			Role:    "assistant",
			Content: m.streamingSessions[sessionID].Buffer,
		})
		delete(m.streamingSessions, sessionID)
	}()
}
