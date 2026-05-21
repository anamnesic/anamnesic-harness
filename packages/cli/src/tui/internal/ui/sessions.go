package ui

import "fmt"

func (m *Model) switchSession(index int) {
	if index < 0 || index >= len(m.sessions) {
		return
	}

	for i := range m.sessions {
		m.sessions[i].Active = false
	}

	m.currentSession = index
	m.sessions[index].Active = true

	m.messages = []Message{}

	cmd := fmt.Sprintf("Switched to session: %s", m.sessions[index].Title)
	m.messages = append(m.messages, Message{
		Role:    "system",
		Content: cmd,
	})
}

func (m *Model) newSession() {
	newSession := Session{
		ID:     fmt.Sprintf("session-%d", len(m.sessions)+1),
		Title:  fmt.Sprintf("Session %d", len(m.sessions)+1),
		Active: true,
	}

	for i := range m.sessions {
		m.sessions[i].Active = false
	}

	m.sessions = append(m.sessions, newSession)
	m.currentSession = len(m.sessions) - 1
	m.messages = []Message{}
}

func (m *Model) deleteSession(index int) {
	if index < 0 || index >= len(m.sessions) {
		return
	}

	m.sessions = append(m.sessions[:index], m.sessions[index+1:]...)

	if len(m.sessions) == 0 {
		m.newSession()
	} else if m.currentSession >= len(m.sessions) {
		m.currentSession = len(m.sessions) - 1
	}
}
