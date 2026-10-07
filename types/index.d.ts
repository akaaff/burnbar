export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'burnbar': { limits: Limit[]; now: number; isLight: boolean }
  }
}
