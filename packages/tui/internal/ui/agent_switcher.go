package ui

type Agent struct {
	ID          string
	Name        string
	Description string
	Model       string
}

func (m *Model) renderAgentSwitcher() string {
	agents := []Agent{
		{ID: "default", Name: "Default Agent", Description: "General purpose agent", Model: "gpt-4"},
		{ID: "coder", Name: "Coder", Description: "Specialized in coding", Model: "gpt-4-turbo"},
		{ID: "analyst", Name: "Analyst", Description: "Data analysis expert", Model: "claude-3"},
	}

	overlay := m.overlays[OverlayAgentSwitcher]
	if !overlay.Visible {
		return ""
	}

	style := lipgloss.NewStyle().
		Width(50).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(m.theme.Border)).
		Padding(1)

	content := "Switch Agent\n\n"
	for i, agent := range agents {
		if i == overlay.Index {
			content += "> " + agent.Name + " (" + agent.Model + ")\n"
			content += "  " + agent.Description + "\n"
		} else {
			content += "  " + agent.Name + "\n"
		}
	}

	return lipgloss.Place(
		m.width, m.height,
		lipgloss.Center, lipgloss.Center,
		style.Render(content),
	)
}

func (m *Model) initOverlays() {
	m.overlays[OverlayAgentSwitcher] = NewOverlay(OverlayAgentSwitcher)
}
