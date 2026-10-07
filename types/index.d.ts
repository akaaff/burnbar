export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

// which background the colours are tuned for; 'auto' when Claude Code follows the terminal's
export type Palette = 'dark' | 'light' | 'auto'

declare module 'claude-code' {
  interface PluginState {
    'burnbar': { limits: Limit[]; now: number; palette: Palette }
  }
}
