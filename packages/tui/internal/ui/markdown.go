package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/glamour"
)

func (m *Model) renderMarkdown(content string) string {
	glamourStyle := "dracula"
	if !m.theme.Dark {
		glamourStyle = "ascii"
	}

	r, _ := glamour.NewTermRenderer(
		glamour.ColorProfile(glamour.ANSI256),
		glamour.GlamourStyle(glamourStyle),
		glamour.Width(m.width-34),
	)

	out, err := r.Render(content)
	if err != nil {
		return content
	}

	return strings.TrimSpace(out)
}

func (m *Model) renderMain() string {
	style := lipgloss.NewStyle().
		Width(m.width - 32).
		Height(m.height - 6).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(m.theme.Border))

	var content string
	for _, msg := range m.messages {
		header := fmt.Sprintf("[%s]", msg.Role)
		rendered := m.renderMarkdown(msg.Content)
		content += header + "\n" + rendered + "\n\n"
	}

	return style.Render(content)
}
