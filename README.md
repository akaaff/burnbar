# claude-usage-meter

A Claude Code plugin that shows how much of your Claude usage limits you've used, right above the prompt:

```
5h ▰▰▱▱▱▱▱▱▱▱ 23%  ↻ 2h 14m  ·  Week ▰▱▱▱▱▱▱▱▱▱ 8%  ↻ 3d 4h
```

- One bar per limit window (5-hour and weekly) that fills as you use it, segments fading green → red
- Percentage used, coloured green → red as it climbs; dimmed countdown to each reset
- `/usage-meter` opens a larger side panel with the same bars
- Darker palette when Claude Code's theme is a light one

Readings come from Claude Code itself after each reply, so the strip appears once Claude has answered at least once. Only Pro and Max subscriptions report usage limits; on API billing it stays hidden.

## Install

One command, the same on macOS, Linux and Windows:

```bash
claude plugin install usage-meter --marketplace akaaff/claude-usage-meter
```

Restart Claude Code (or run `/reload-plugins`). Update later with `claude plugin update usage-meter@claude-usage-meter`; remove with `claude plugin uninstall usage-meter@claude-usage-meter`.

Or from inside Claude Code:

```
/plugin marketplace add akaaff/claude-usage-meter
/plugin install usage-meter@claude-usage-meter
```

## Manual install (to hack on it)

Clone the repo, point Claude Code at the folder in `~/.claude/settings.json`, then restart Claude Code. Edits to the folder reload live.

### macOS / Linux

```bash
git clone https://github.com/akaaff/claude-usage-meter ~/claude-usage-meter
```

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/claude-usage-meter"
  }
}
```

### Windows

```powershell
git clone https://github.com/akaaff/claude-usage-meter $HOME\claude-usage-meter
```

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "C:\\Users\\<you>\\claude-usage-meter"
  }
}
```

Backslashes must be doubled inside JSON.

### Notes (manual install)

- Already have an `env` block? Add the `CLAUDE_CODE_PLUGIN_DIRS` line to it rather than adding a second block.
- Several plugin folders go in the same variable, separated by `:` on macOS/Linux and `;` on Windows.
- For a single terminal session instead: `claude --plugin-dir <path>`.
- If the bars show as boxes, your font lacks `▰`/`▱`; swap them in `segments()` for e.g. `#`/`-`.

## Customising

Everything is in [`hooks/register.tsx`](hooks/register.tsx):

| What | Where |
| --- | --- |
| Segment characters | `segments()` (`▰` / `▱`) |
| Colours and light-theme palette | `gradient()` |
| Strip layout and spacing | the `AbovePrompt` render hook |
| Side panel | the `Pane` render hook |

## Development

```bash
claude plugin validate .
claude plugin test .
```
