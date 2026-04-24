# Skills System

Skills are Markdown documents that provide the agent with specialized domain knowledge and instructions for particular tasks. They are injected into the system prompt before the agent starts working.

---

## How Skills Work

1. Skills are stored as `.skill.md` files in the **skills directory** on the user's machine.
2. When a task starts, the `get_skills_list` command returns available skill metadata.
3. The agent reads relevant skill files using `file_read` and incorporates their instructions.
4. The LLM uses the skill content to execute domain-specific tasks correctly (e.g., which Python library to use for PDF manipulation).

### Skills Directory

Skills are stored in the OS application data directory:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/kuse-cowork/skills/` |
| Windows | `%APPDATA%\kuse-cowork\skills\` |
| Linux | `~/.local/share/kuse-cowork/skills/` |

Each skill lives in its own sub-directory:
```
skills/
├── pdf/
│   └── pdf.skill.md
├── docx/
│   └── docx.skill.md
├── xlsx/
│   └── xlsx.skill.md
└── pptx/
    └── pptx.skill.md
```

---

## Bundled Default Skills

Four skills are bundled with the application and installed automatically on first launch.

### `pdf` — PDF Processing

Provides instructions for reading, creating, merging, splitting, and form-filling PDF documents using Python libraries (`pypdf`, `reportlab`, `pdfplumber`).

**Typical use cases:**
- Extract text or tables from a PDF
- Merge or split PDF documents
- Fill out PDF forms programmatically
- Generate new PDFs from data

**Key libraries:** `pypdf`, `reportlab`, `pdfplumber`

---

### `docx` — Word Document Processing

Instructions for creating, editing, and extracting content from Microsoft Word (`.docx`) files using Python's `python-docx` library.

**Typical use cases:**
- Generate reports or letters as Word documents
- Extract text or tables from existing `.docx` files
- Apply styles, headings, and formatting

**Key library:** `python-docx`

---

### `xlsx` — Excel Spreadsheet Processing

Instructions for reading, writing, and manipulating Excel (`.xlsx`) spreadsheets using `openpyxl` and `pandas`.

**Typical use cases:**
- Parse data from spreadsheets
- Generate reports with charts and formulas
- Automate data processing pipelines

**Key libraries:** `openpyxl`, `pandas`

---

### `pptx` — PowerPoint Presentation Processing

Instructions for creating and editing Microsoft PowerPoint (`.pptx`) files using `python-pptx`.

**Typical use cases:**
- Auto-generate slide decks from data or text
- Extract content from existing presentations
- Apply themes and layouts

**Key library:** `python-pptx`

---

## Skill File Format

A skill file is a Markdown document with an optional YAML front-matter header:

```markdown
---
name: my-skill
description: A short description shown in the Skills panel
license: MIT
---

# Skill Title

## Overview
Describe what this skill does.

## Usage
Provide examples, code snippets, and instructions the agent should follow.
```

The `name` and `description` fields appear in the **Skills** panel in the sidebar.

---

## Adding a Custom Skill

1. Create a new directory in the skills folder: `skills/my-skill/`
2. Create `my-skill.skill.md` inside it with the format above.
3. The skill will appear in the **Skills** panel on the next app launch (or after restarting the app).

There is no limit on the number of skills you can add.

---

## Skills Panel

The **Skills** panel (book icon in the sidebar) shows all installed skills with their names and descriptions. Click a skill to view its full documentation.
