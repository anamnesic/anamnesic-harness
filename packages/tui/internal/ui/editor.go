package ui

import (
	"os"
	"os/exec"
	"path/filepath"
)

func (m *Model) openExternalEditor() tea.Cmd {
	return func() tea.Msg {
		editor := os.Getenv("EDITOR")
		if editor == "" {
			editor = "nano"
		}

		tmpFile := filepath.Join(os.TempDir(), "kairos-input.txt")
		os.WriteFile(tmpFile, []byte(m.input), 0644)

		cmd := exec.Command(editor, tmpFile)
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		cmd.Run()

		content, _ := os.ReadFile(tmpFile)
		m.input = string(content)
		os.Remove(tmpFile)

		return nil
	}
}
