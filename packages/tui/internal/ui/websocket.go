package ui

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/charmbracelet/bubbletea"
)

type WebSocketMessage struct {
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload"`
	Timestamp int64       `json:"timestamp"`
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
				Type:    "token",
				Payload: "Simulated token",
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
			Type: "user_message",
			Payload: map[string]string{
				"content":    content,
				"session_id": sessionId,
			},
			Timestamp: time.Now().UnixMilli(),
		}

		data, _ := json.Marshal(msg)
		fmt.Printf("Sending: %s\n", string(data))
		return nil
	}
}

type errMsg struct {
	err error
}

type connectedMsg struct {
	connected bool
}
