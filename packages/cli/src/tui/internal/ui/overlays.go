package ui

import (
	"github.com/charmbracelet/lipgloss"
)

type OverlayType string

const (
	OverlayModelPicker   OverlayType = "model_picker"
	OverlayAgentSwitcher OverlayType = "agent_switcher"
	OverlayPalette       OverlayType = "palette"
	OverlayPermissions   OverlayType = "permissions"
	OverlayLogs         OverlayType = "logs"
	OverlayTheme        OverlayType = "theme"
)

type Overlay struct {
	Type    OverlayType
	Visible bool
	Items   []string
	Index   int
}

func NewOverlay(overlayType OverlayType) *Overlay {
	return &Overlay{
		Type:    overlayType,
		Visible: false,
		Index:   0,
	}
}

func (o *Overlay) Toggle() {
	o.Visible = !o.Visible
	if o.Visible {
		o.Index = 0
	}
}

func (m *Model) renderOverlay(overlay *Overlay, width, height int) string {
	if !overlay.Visible {
		return ""
	}

	style := lipgloss.NewStyle().
		Width(width - 20).
		Height(height - 10).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(m.theme.Border)).
		Padding(1)

	var content string
	switch overlay.Type {
	case OverlayModelPicker:
		content = m.renderModelPicker()
	case OverlayPalette:
		content = m.renderPalette()
	case OverlayLogs:
		content = m.renderLogsView()
	case OverlayTheme:
		content = m.renderThemePicker()
	}

	return lipgloss.Place(
		width, height,
		lipgloss.Center, lipgloss.Center,
		style.Render(content),
	)
}

func (m *Model) renderModelPicker() string {
	models := []string{"gpt-4", "gpt-3.5-turbo", "claude-3", "gemini"}
	return "Select Model\n\n" + renderList(models, 0)
}

func (m *Model) renderPalette() string {
	commands := LoadCommands()
	var items []string
	for _, cmd := range commands {
		items = append(items, cmd.Name)
	}
	return "Command Palette\n\n" + renderList(items, 0)
}

func (m *Model) renderLogsView() string {
	return "Logs\n\n[No logs yet]"
}

func (m *Model) renderThemePicker() string {
	themes := []string{"kairos", "catppuccin", "dracula", "gruvbox", "tokyonight", "monokai"}
	return "Select Theme\n\n" + renderList(themes, 0)
}

func renderList(items []string, selected int) string {
	var out string
	for i, item := range items {
		if i == selected {
			out += "> " + item + "\n"
		} else {
			out += "  " + item + "\n"
		}
	}
	return out
}
