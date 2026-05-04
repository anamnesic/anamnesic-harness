package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	Theme       string
	WebsocketURL string
	Mode        string
	Editor      string
}

func Load() (*Config, error) {
	v := viper.New()

	v.SetDefault("theme", "kairos")
	v.SetDefault("websocket_url", "ws://localhost:8080")
	v.SetDefault("mode", "standalone")
	v.SetDefault("editor", os.Getenv("EDITOR"))

	v.SetConfigName("kairos")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("$HOME/.config/kairos")
	v.AddConfigPath("/etc/kairos")

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config: %w", err)
		}
	}

	return &Config{
		Theme:       v.GetString("theme"),
		WebsocketURL: v.GetString("websocket_url"),
		Mode:        v.GetString("mode"),
		Editor:      v.GetString("editor"),
	}, nil
}
