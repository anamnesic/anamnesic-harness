package main

import (
	"fmt"
	"os"

	"github.com/anomalyco/kairos/packages/tui/internal/config"
	"github.com/anomalyco/kairos/packages/tui/internal/ui"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "kairos",
	Short: "Kairos TUI - Terminal UI for Kairos",
	Long:  "A terminal user interface for interacting with Kairos Core",
}

var tuiCmd = &cobra.Command{
	Use:   "tui",
	Short: "Launch the TUI",
	Run: func(cmd *cobra.Command, args []string) {
		cfg, err := config.Load()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: %v\n", err)
		}

		mode := "standalone"
		wsURL := ""
		if cfg != nil {
			mode = cfg.Mode
			if cfg.WebsocketURL != "" {
				wsURL = cfg.WebsocketURL
				mode = "connected"
			}
		}

		if err := ui.RunWithMode(mode, wsURL); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
	},
}

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Run a prompt in non-interactive mode",
	Run: func(cmd *cobra.Command, args []string) {
		prompt, _ := cmd.Flags().GetString("prompt")
		if prompt == "" && len(args) > 0 {
			prompt = args[0]
		}
		ui.RunNonInteractive(prompt)
	},
}

func init() {
	rootCmd.AddCommand(tuiCmd)
	rootCmd.AddCommand(runCmd)
	runCmd.Flags().StringP("prompt", "p", "", "Prompt to send")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
