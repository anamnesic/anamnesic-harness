package ui

import "github.com/charmbracelet/lipgloss"

type PermissionRequest struct {
	ToolName string
	Args     map[string]interface{}
	SessionID string
	Granted  bool
	Denied   bool
}

func (m *Model) renderPermissionDialog() string {
	if m.currentPermission == nil {
		return ""
	}

	style := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(m.theme.Border)).
		Padding(1, 2).
		Width(60)

	content := "Permission Request\n\n"
	content += "Tool: " + m.currentPermission.ToolName + "\n"
	content += "Session: " + m.currentPermission.SessionID + "\n\n"
	content += "[y] Allow  [n] Deny  [a] Always Allow"

	return lipgloss.Place(
		m.width, m.height,
		lipgloss.Center, lipgloss.Center,
		style.Render(content),
	)
}

func (m *Model) handlePermissionKey(msg string) bool {
	if m.currentPermission == nil {
		return false
	}

	switch msg {
	case "y", "Y":
		m.currentPermission.Granted = true
		m.currentPermission = nil
		return true
	case "n", "N":
		m.currentPermission.Denied = true
		m.currentPermission = nil
		return true
	case "a", "A":
		m.currentPermission.Granted = true
		return true
	}

	return false
}
