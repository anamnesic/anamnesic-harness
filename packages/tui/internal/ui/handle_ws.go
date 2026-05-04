package ui

import (
	"encoding/json"
	"fmt"

	"github.com/charmbracelet/bubbletea"
)

func (m *Model) handleWebSocketMessage(msg WebSocketMessage) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case "session_sync":
		return m.handleSessionSync(msg)
	case "tool_sync":
		return m.handleToolSync(msg)
	case "token":
		return m.handleTokenStream(msg)
	case "pong":
		return m, nil
	case "error":
		fmt.Printf("WebSocket error: %v\n", msg.Payload)
	}

	return m, nil
}

func (m *Model) handleSessionSync(msg WebSocketMessage) (tea.Model, tea.Cmd) {
	payload, ok := msg.Payload.(map[string]interface{})
	if !ok {
		return m, nil
	}

	sessionsData, ok := payload["sessions"].([]interface{})
	if !ok {
		return m, nil
	}

	m.sessions = nil
	for _, s := range sessionsData {
		sessionMap, ok := s.(map[string]interface{})
		if !ok {
			continue
		}

		session := Session{
			ID:    getString(sessionMap, "id"),
			Title: getString(sessionMap, "title"),
		}
		m.sessions = append(m.sessions, session)
	}

	return m, nil
}

func (m *Model) handleToolSync(msg WebSocketMessage) (tea.Model, tea.Cmd) {
	payload, ok := msg.Payload.(map[string]interface{})
	if !ok {
		return m, nil
	}

	_ = payload

	m.messages = append(m.messages, Message{
		Role:    "system",
		Content: "Tools synchronized from Core",
	})
	return m, nil
}

func (m *Model) handleTokenStream(msg WebSocketMessage) (tea.Model, tea.Cmd) {
	payload, ok := msg.Payload.(map[string]interface{})
	if !ok {
		return m, nil
	}

	token, _ := payload["token"].(string)
	done, _ := payload["done"].(bool)

	if m.streamingSessions == nil {
		m.streamingSessions = make(map[string]*StreamingSession)
	}

	sessionID := msg.SessionID
	if sessionID == "" {
		sessionID = "default"
	}

	ss, exists := m.streamingSessions[sessionID]
	if !exists {
		ss = &StreamingSession{
			SessionID: sessionID,
			Buffer:    "",
			Done:      false,
		}
		m.streamingSessions[sessionID] = ss
	}

	ss.Buffer += token

	if done {
		ss.Done = true
		m.messages = append(m.messages, Message{
			Role:    "assistant",
			Content: ss.Buffer,
		})
		delete(m.streamingSessions, sessionID)
	}

	return m, nil
}

func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}
