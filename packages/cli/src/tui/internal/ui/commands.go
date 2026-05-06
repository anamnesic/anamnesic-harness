package ui

import (
	"os"
	"path/filepath"
)

type Command struct {
	Name        string
	Description string
	Content     string
}

func LoadCommands() []Command {
	commands := []Command{}

	paths := []string{
		filepath.Join(os.Getenv("HOME"), ".config/kairos/commands"),
		".project/.kairos/commands",
	}

	for _, basePath := range paths {
		files, err := filepath.Glob(filepath.Join(basePath, "*.md"))
		if err != nil {
			continue
		}

		for _, file := range files {
			name := filepath.Base(file)
			name = name[:len(name)-3]

			content := readFile(file)
			if content != "" {
				commands = append(commands, Command{
					Name:    name,
					Content: content,
				})
			}
		}
	}

	return commands
}

func readFile(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return string(data)
}
