package ui

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/charmbracelet/bubbletea"
)

type WebSocketMessage struct {
	Type       string      `json:"type"`
	Payload    interface{} `json:"payload"`
	Timestamp  int64       `json:"timestamp"`
	SessionID  string      `json:"sessionId,omitempty"`
	RequestID  string      `json:"requestId,omitempty"`
}

type WebSocketClient struct {
	url       string
	connected  bool
	messages  chan WebSocketMessage
	done      chan bool
}

func NewWebSocketClient(url string) *WebSocketClient {
	return &WebSocketClient{
		url:      url,
		messages: make(chan WebSocketMessage, 100),
		done:     make(chan bool),
	}
}

func (w *WebSocketClient) Connect() tea.Cmd {
	return func() tea.Msg {
		resp, err := http.Get(w.url + "/health")
		if err != nil {
			return errMsg{err}
		}
		defer resp.Body.Close()

		if resp.StatusCode == 200 {
			w.connected = true
			go w.listen()
			return connectedMsg{true}
		}
		return connectedMsg{false}
	}
}

func (w *WebSocketClient) listen() {
	for {
		select {
		case <-w.done:
			return
		default:
			msg := WebSocketMessage{
				Type:      "token",
				Payload:   map[string]string{"token": "Simulated token", "done": "false"},
				Timestamp: time.Now().UnixMilli(),
			}
			w.messages <- msg
			time.Sleep(100 * time.Millisecond)
		}
	}
}

func (w *WebSocketClient) Close() {
	close(w.done)
}

func (w *WebSocketClient) SendMessage(content string, sessionId string) tea.Cmd {
	return func() tea.Msg {
		msg := WebSocketMessage{
			Type: "chat",
			Payload: map[string]interface{}{
				"sessionId": sessionId,
				"message":   content,
				"stream":    true,
			},
			Timestamp: time.Now().UnixMilli(),
			RequestID: fmt.Sprintf("req-%d", time.Now().UnixNano()),
		}

		data, _ := json.Marshal(msg)
		fmt.Printf("Sending: %s\n", string(data))
		return nil
	}
}

func (w *WebSocketClient) SendSyncRequest() tea.Cmd {
	return func() tea.Msg {
		msg := WebSocketMessage{
			Type:      "ping",
			Timestamp: time.Now().UnixMilli(),
		}
		data, _ := json.Marshal(msg)
		fmt.Printf("Sync: %s\n", string(data))
		return nil
	}
}

type errMsg struct {
	err error
}

type connectedMsg struct {
	connected bool
}
