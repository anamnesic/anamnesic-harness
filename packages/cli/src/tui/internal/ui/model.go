package ui

import (
	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type Mode string

const (
	ModeConnected  Mode = "connected"
	ModeStandalone Mode = "standalone"
)

type Model struct {
	ready              bool
	width              int
	height             int
	mode               Mode
	connected          bool
	sessions           []Session
	currentSession     int
	messages           []Message
	input              string
	cursorMode         cursorMode
	showHelp           bool
	theme              Theme
	overlays           map[OverlayType]*Overlay
	streamingSessions  map[string]*StreamingSession
	currentPermission  *PermissionRequest
	wsClient           *WebSocketClient
}

func InitialModel() Model {
	return Model{
		mode:           ModeStandalone,
		sessions:       []Session{},
		messages:       []Message{},
		cursorMode:     cursorBlink,
		theme:          DefaultTheme(),
		overlays: map[OverlayType]*Overlay{
			OverlayModelPicker:   NewOverlay(OverlayModelPicker),
			OverlayAgentSwitcher: NewOverlay(OverlayAgentSwitcher),
			OverlayPalette:       NewOverlay(OverlayPalette),
			OverlayLogs:          NewOverlay(OverlayLogs),
			OverlayTheme:         NewOverlay(OverlayTheme),
		},
	}
}

type cursorMode int

const (
	cursorBlink cursorMode = iota
	cursorStatic
)

type Session struct {
	ID      string
	Title   string
	Active  bool
}

type Message struct {
	Role      string
	Content   string
	Timestamp int64
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		return m.handleKey(msg)
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.ready = true
		return m, nil
	case tokenMsg:
		return m.handleStreaming(msg)
	case connectedMsg:
		m.connected = msg.connected
		if msg.connected && m.wsClient != nil {
			m.mode = ModeConnected
			return m, m.wsClient.SendSyncRequest()
		}
	}

	if m.wsClient != nil && m.connected {
		select {
		case wsMsg := <-m.wsClient.messages:
			return m.handleWebSocketMessage(wsMsg)
		default:
		}
	}
	return m, nil
}

func (m Model) View() string {
	if !m.ready {
		return "Loading..."
	}

	header := m.renderHeader()
	sidebar := m.renderSidebar()
	main := m.renderMain()
	input := m.renderInput()
	help := m.renderHelp()

	view := lipgloss.JoinVertical(lipgloss.Left,
		header,
		lipgloss.JoinHorizontal(lipgloss.Top, sidebar, main),
		input,
		help,
	)

	for _, overlay := range m.overlays {
		if overlay.Visible {
			view = m.renderOverlay(overlay, m.width, m.height)
		}
	}

	return view
}

func (m Model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.anyOverlayVisible() {
		return m.handleOverlayKey(msg)
	}

	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit
	case "ctrl+o":
		m.overlays[OverlayModelPicker].Toggle()
	case "ctrl+k":
		m.overlays[OverlayPalette].Toggle()
	case "ctrl+n":
		m.sessions = append(m.sessions, Session{
			ID:     "new",
			Title:  "New Session",
			Active: true,
		})
		m.currentSession = len(m.sessions) - 1
	case "ctrl+x":
		if len(m.messages) > 0 {
			m.messages = m.messages[:len(m.messages)-1]
		}
	case "ctrl+l":
		m.overlays[OverlayLogs].Toggle()
	case "ctrl+s":
		if m.input != "" {
			if m.wsClient != nil && m.connected {
				sessionID := "default"
				if len(m.sessions) > m.currentSession {
					sessionID = m.sessions[m.currentSession].ID
				}
				return m, m.wsClient.SendMessage(m.input, sessionID)
			}

			m.messages = append(m.messages, Message{
				Role:    "user",
				Content: m.input,
			})

			go m.runStandaloneAgent(m.input)
			m.input = ""
		}
	case "ctrl+e":
		return m, m.openExternalEditor()
	case "i":
	case "esc":
		m.showHelp = !m.showHelp
	case "?":
		m.showHelp = !m.showHelp
	}

	return m, nil
}

func (m Model) anyOverlayVisible() bool {
	for _, o := range m.overlays {
		if o.Visible {
			return true
		}
	}
	return false
}

func (m Model) handleOverlayKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		for k := range m.overlays {
			m.overlays[k] = &Overlay{Type: m.overlays[k].Type, Visible: false}
		}
	}
	return m, nil
}

func (m Model) renderHeader() string {
	style := lipgloss.NewStyle().
		Background(lipgloss.Color(m.theme.HeaderBg)).
		Foreground(lipgloss.Color(m.theme.HeaderFg)).
		Padding(0, 1)

	return style.Render("Kairos - " + string(m.mode))
}

func (m Model) renderSidebar() string {
	style := lipgloss.NewStyle().
		Width(30).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(m.theme.Border))

	var sessions string
	for i, s := range m.sessions {
		if i == m.currentSession {
			sessions += lipgloss.NewStyle().
				Foreground(lipgloss.Color(m.theme.ActiveSession)).
				Render("> " + s.Title + "\n")
		} else {
			sessions += "  " + s.Title + "\n"
		}
	}

	return style.Render("Sessions\n" + sessions)
}

func (m Model) renderInput() string {
	style := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(m.theme.Border)).
		Width(m.width - 2).
		Padding(0, 1)

	return style.Render("> " + m.input)
}

func (m Model) renderHelp() string {
	if !m.showHelp {
		return ""
	}
	return lipgloss.NewStyle().
		Foreground(lipgloss.Color(m.theme.HelpFg)).
		Render("Ctrl+C: quit | Ctrl+O: model | Ctrl+N: new session | ?: help")
}
