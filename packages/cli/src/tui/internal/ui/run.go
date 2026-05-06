package ui

import (
	"fmt"
	"os"
)

func RunNonInteractive(prompt string) {
	if prompt == "" {
		fmt.Fprintf(os.Stderr, "Error: No prompt provided\n")
		os.Exit(1)
	}

	fmt.Println("Running in non-interactive mode...")
	fmt.Println("Prompt:", prompt)
	fmt.Println("Response: Hello from Kairos TUI (non-interactive mode)")
}
