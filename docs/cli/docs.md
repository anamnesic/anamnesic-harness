---
summary: "CLI reference for `kairos docs` (search the live docs index)"
read_when:
  - You want to search the live kairos docs from the terminal
title: "Docs"
---

# `kairos docs`

Search the live docs index.

Arguments:

- `[query...]`: search terms to send to the live docs index

Examples:

```bash
kairos docs
kairos docs browser existing-session
kairos docs sandbox allowHostControl
kairos docs gateway token secretref
```

Notes:

- With no query, `kairos docs` opens the live docs search entrypoint.
- Multi-word queries are passed through as one search request.

## Related

- [CLI reference](/cli)
