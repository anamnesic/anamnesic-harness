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
		if err := ui.Run(); err != nil {
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
		fmt.Println("Running prompt:", prompt)
		fmt.Println("Response: Hello from Kairos TUI (non-interactive mode)")
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
