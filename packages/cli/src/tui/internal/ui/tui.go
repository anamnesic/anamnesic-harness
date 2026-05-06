package ui

import (
	"github.com/charmbracelet/bubbletea"
)

func Run() error {
	p := tea.NewProgram(
		InitialModel(),
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)

	_, err := p.Run()
	return err
}

func RunWithMode(mode string, wsURL string) error {
	model := InitialModel()

	if mode == "connected" {
		model.mode = ModeConnected
	}

	if wsURL != "" {
		model.wsClient = NewWebSocketClient(wsURL)
	}

	p := tea.NewProgram(
		model,
		tea.WithAltScreen(),
	)

	_, err := p.Run()
	return err
}
