package ui

type Theme struct {
	Name          string
	HeaderBg      string
	HeaderFg      string
	Border        string
	ActiveSession string
	HelpFg        string
	Dark          bool
}

func DefaultTheme() Theme {
	return Theme{
		Name:          "kairos",
		HeaderBg:      "62",
		HeaderFg:      "230",
		Border:        "240",
		ActiveSession: "86",
		HelpFg:        "244",
		Dark:          true,
	}
}

func CatppuccinTheme() Theme {
	return Theme{
		Name:          "catppuccin",
		HeaderBg:      "117",
		HeaderFg:      "237",
		Border:        "66",
		ActiveSession: "117",
		HelpFg:        "245",
		Dark:          true,
	}
}

func DraculaTheme() Theme {
	return Theme{
		Name:          "dracula",
		HeaderBg:      "61",
		HeaderFg:      "231",
		Border:        "240",
		ActiveSession: "141",
		HelpFg:        "244",
		Dark:          true,
	}
}

func GruvboxTheme() Theme {
	return Theme{
		Name:          "gruvbox",
		HeaderBg:      "166",
		HeaderFg:      "235",
		Border:        "239",
		ActiveSession: "142",
		HelpFg:        "246",
		Dark:          true,
	}
}

func TokyoNightTheme() Theme {
	return Theme{
		Name:          "tokyonight",
		HeaderBg:      "62",
		HeaderFg:      "231",
		Border:        "240",
		ActiveSession: "75",
		HelpFg:        "244",
		Dark:          true,
	}
}

func MonokaiTheme() Theme {
	return Theme{
		Name:          "monokai",
		HeaderBg:      "172",
		HeaderFg:      "235",
		Border:        "239",
		ActiveSession: "148",
		HelpFg:        "246",
		Dark:          true,
	}
}

func GetTheme(name string) Theme {
	switch name {
	case "catppuccin":
		return CatppuccinTheme()
	case "dracula":
		return DraculaTheme()
	case "gruvbox":
		return GruvboxTheme()
	case "tokyonight":
		return TokyoNightTheme()
	case "monokai":
		return MonokaiTheme()
	default:
		return DefaultTheme()
	}
}
