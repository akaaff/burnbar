# burnbar

A Claude Code plugin that shows how much of your Claude usage limits you've used, right above the prompt:

```
5h ▰▰▱▱▱▱▱▱▱▱ 23%  ↻ 2h 14m  ·  Week ▰▱▱▱▱▱▱▱▱▱ 8%  ↻ 3d 4h
```

- One bar per limit window (5-hour and weekly) that fills as you use it, segments fading green → red
- Percentage used, coloured green → red as it climbs; dimmed countdown to each reset
- `/burnbar` opens a larger side panel with the same bars
- Colours tuned to Claude Code's `theme` setting: brighter for dark themes, darker for light ones, and an in-between palette for `auto`

Readings come from Claude Code itself after each reply, so the strip appears once Claude has answered at least once. Only Pro and Max subscriptions report usage limits; on API billing it stays hidden.

## Install

One command, the same on macOS, Linux and Windows:

```bash
claude plugin install burnbar --marketplace akaaff/burnbar
```

Restart Claude Code (or run `/reload-plugins`). Update later with `claude plugin update burnbar@burnbar`; remove with `claude plugin uninstall burnbar@burnbar`.

Or from inside Claude Code:

```
/plugin marketplace add akaaff/burnbar
/plugin install burnbar@burnbar
```

## Manual install (to hack on it)

Clone the repo, point Claude Code at the folder in `~/.claude/settings.json`, then restart Claude Code. Edits to the folder reload live.

### macOS / Linux

```bash
git clone https://github.com/akaaff/burnbar ~/burnbar
```

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/burnbar"
  }
}
```

### Windows

```powershell
git clone https://github.com/akaaff/burnbar $HOME\burnbar
```

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "C:\\Users\\<you>\\burnbar"
  }
}
```

Backslashes must be doubled inside JSON.

### Notes (manual install)

- Already have an `env` block? Add the `CLAUDE_CODE_PLUGIN_DIRS` line to it rather than adding a second block.
- Several plugin folders go in the same variable, separated by `:` on macOS/Linux and `;` on Windows.
- For a single terminal session instead: `claude --plugin-dir <path>`.
- If the bars show as boxes, your font lacks `▰`/`▱`; swap them in `segments()` for e.g. `#`/`-`.

## What it accesses

- **Reads:** the usage-limit figures Claude Code already reports after each reply (percent used and reset time per window), and Claude Code's `theme` setting to pick a palette (`auto` gets an in-between palette, since plugins can't see which background the terminal has).
- **Stores:** only those figures, in Claude Code's per-session plugin state; nothing is written to disk.
- **Sends:** nothing. The plugin makes no network requests, runs no processes and reads no files.

## Customising

Everything is in [`hooks/register.tsx`](hooks/register.tsx):

| What | Where |
| --- | --- |
| Segment characters | `segments()` (`▰` / `▱`) |
| Colours, and the dark / light / auto palettes | `TONES` and `gradient()` |
| Strip layout and spacing | the `AbovePrompt` render hook |
| Side panel | the `Pane` render hook |

## Development

```bash
claude plugin validate .
claude plugin test .
```

## License

MIT, see [LICENSE](LICENSE).
