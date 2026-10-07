# claude-usage-meter

A Claude Code plugin that shows how much of your Claude usage limit is left, right above the prompt:

```
5h ▰▰▰▰▰▰▰▰▱▱ 77%  ↻ 2h 14m  ·  Week ▰▰▰▰▰▰▰▰▰▱ 92%  ↻ 3d 4h
```

- One bar per limit window (5-hour and weekly), segments fading green → red
- Percentage coloured by how much is left; dimmed countdown to each reset
- `/usage-meter` opens a larger side panel with the same bars
- Darker palette when Claude Code's theme is a light one

Readings come from Claude Code itself after each reply, so the strip appears once Claude has answered at least once. Only Pro and Max subscriptions report usage limits; on API billing it stays hidden.

## Install

Clone it anywhere, then point Claude Code at the folder in `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "C:\path\to\claude-usage-meter"
  }
}
```

Restart Claude Code. For a single terminal session you can use `claude --plugin-dir <path>` instead.

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
