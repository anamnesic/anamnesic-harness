package ui

import "github.com/charmbracelet/lipgloss"

type Styles struct {
	Header      lipgloss.Style
	Sidebar     lipgloss.Style
	Main        lipgloss.Style
	Input       lipgloss.Style
	Help        lipgloss.Style
	ActiveItem  lipgloss.Style
	InactiveItem lipgloss.Style
}

func NewStyles(theme Theme) Styles {
	return Styles{
		Header: lipgloss.NewStyle().
			Background(lipgloss.Color(theme.HeaderBg)).
			Foreground(lipgloss.Color(theme.HeaderFg)).
			Padding(0, 1),
		Sidebar: lipgloss.NewStyle().
			Width(30).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(theme.Border)),
		Main: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(theme.Border)),
		Input: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(theme.Border)).
			Padding(0, 1),
		Help: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.HelpFg)),
		ActiveItem: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.ActiveSession)),
		InactiveItem: lipgloss.NewStyle(),
	}
}
