package ui

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/charmbracelet/bubbletea"
)

var _ = time.Sleep

type StreamingSession struct {
	SessionID string
	Buffer    string
	Done      bool
	ToolCalls []ToolCallStatus
}

type ToolCallStatus struct {
	Name     string
	Status   string
	Result   string
	Duration time.Duration
}

func (m *Model) startStreaming(sessionID string, content string) {
	if m.streamingSessions == nil {
		m.streamingSessions = make(map[string]*StreamingSession)
	}

	m.streamingSessions[sessionID] = &StreamingSession{
		SessionID: sessionID,
		Buffer:    "",
		Done:      false,
	}

	go m.streamTokens(sessionID, content)
}

func (m *Model) streamTokens(sessionID string, content string) {
	ss := m.streamingSessions[sessionID]
	if ss == nil {
		return
	}

	for _, char := range content {
		ss.Buffer += string(char)
		time.Sleep(20 * time.Millisecond)

		if ss.Done {
			break
		}
	}

	ss.Done = true

	if m.wsClient != nil && m.wsClient.connected {
		m.messages = append(m.messages, Message{
			Role:    "assistant",
			Content: ss.Buffer,
		})
		delete(m.streamingSessions, sessionID)
	}
}

type tokenMsg struct {
	SessionID string
	Token     string
}

type toolCallMsg struct {
	SessionID string
	ToolName  string
	Status    string
	Result    string
}

func (m *Model) handleStreaming(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tokenMsg:
		ss := m.streamingSessions[msg.SessionID]
		if ss != nil {
			ss.Buffer += msg.Token
		}
		return m, nil

	case toolCallMsg:
		ss := m.streamingSessions[msg.SessionID]
		if ss != nil {
			ss.ToolCalls = append(ss.ToolCalls, ToolCallStatus{
				Name:   msg.ToolName,
				Status: msg.Status,
				Result: msg.Result,
			})
		}
		return m, nil
	}

	return m, nil
}

func (m *Model) renderStreamingStatus() string {
	if len(m.streamingSessions) == 0 {
		return ""
	}

	var out string
	for _, ss := range m.streamingSessions {
		out += fmt.Sprintf("[Streaming: %d chars]", len(ss.Buffer))
		for _, tc := range ss.ToolCalls {
			out += fmt.Sprintf("\n  Tool: %s (%s)", tc.Name, tc.Status)
		}
	}
	return out
}

func parseWebSocketMessage(data []byte) (WebSocketMessage, error) {
	var msg WebSocketMessage
	err := json.Unmarshal(data, &msg)
	return msg, err
}
