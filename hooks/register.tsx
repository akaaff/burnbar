import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

const PANE = 'usage-meter'
const TITLE = 'Usage'
// a slim dock beside a fullscreen transcript, a short block when inline above the prompt
const SIZE = { rows: 8, columns: 30 } as const
const limits = atom({ plugin: 'usage-meter', key: 'limits' } as const, [])
const now = atom({ plugin: 'usage-meter', key: 'now' } as const, 0)
const isLight = atom({ plugin: 'usage-meter', key: 'isLight' } as const, false)

const LABELS: Record<string, string> = { five_hour: '5-hour', seven_day: 'Weekly', spend_limit: 'Spend' }

export function label(kind: string): string {
  return LABELS[kind] ?? kind
}

// can pass 100 on an exceeded spend limit; the bar caps at full, the number does not
export function percentUsed(limit: Limit): number {
  return Math.max(0, Math.round(limit.percentUsed))
}

// 0 = red, 0.5 = yellow, 1 = green: the hue walks 0° → 120° at fixed saturation and lightness,
// darker and more saturated on a light theme so yellow stays readable on white
export function gradient(fraction: number, light = false): string {
  const hue = 120 * Math.max(0, Math.min(1, fraction))
  const s = light ? 0.85 : 0.75
  const l = light ? 0.36 : 0.5
  const k = (n: number) => (n + hue / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => {
    const v = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
    return Math.round(v * 255).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

// green while little is used, red as the window runs out
export function barColor(used: number, light = false): string {
  return gradient(1 - Math.min(100, used) / 100, light)
}

export function isLightTheme(theme: unknown): boolean {
  return typeof theme === 'string' && theme.includes('light')
}

// one entry per segment, filling with usage: green (left) to red (right), empty ones uncoloured
export function segments(used: number, width: number, light = false): { char: string; color?: string }[] {
  const filled = Math.round((Math.min(100, used) / 100) * width)
  return Array.from({ length: width }, (_, i) =>
    i < filled ? { char: '▰', color: gradient(1 - (i + 0.5) / width, light) } : { char: '▱' },
  )
}

export function shortReset(resetsAt: string | undefined, at: number): string {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - at
  if (!(ms > 0)) return ''
  const mins = Math.round(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function untilReset(resetsAt: string | undefined, at: number): string {
  const left = shortReset(resetsAt, at)
  return left && `resets in ${left}`
}

const SHORT_LABELS: Record<string, string> = { five_hour: '5h', seven_day: 'Week', spend_limit: 'Spend' }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'usage-meter', description: 'Show remaining usage limits in a side panel' })
    const t = await $.clock.now()
    await update($, now, () => t)
    try {
      const { rateLimits } = await $.session.usage()
      await update($, limits, () => rateLimits.map(l => ({ ...l })))
    } catch {
      // no reading yet; session.measure fills it after the first response
    }
    try {
      const theme = (await $.config.list()).find(row => row.key === 'theme')
      await update($, isLight, () => isLightTheme(theme?.value))
    } catch {
      // no theme row on this surface; keep the dark palette
    }
    // tick once a minute so the reset countdowns stay current
    $.clock.every(60_000, () => void $.clock.now().then(t => update($, now, () => t)))
    return next(e)
  })

  on('command.run', { command: 'usage-meter' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE, ...SIZE })
    return { text: 'Usage panel opened.' }
  })

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    await update($, isLight, () => isLightTheme(e.value))
    return result
  }).catch(($, e, next) => next(e)) // never stand in the way of a theme change

  on('session.measure', async ($, e, next) => {
    await update($, limits, () => e.rateLimits.map(l => ({ ...l })))
    const t = await $.clock.now()
    await update($, now, () => t)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, limits)
    const at = await read($, now)
    const light = await read($, isLight)
    const width = Math.max(10, Math.min(40, (e.props.bodyColumns ?? 32) - 2))

    if (list.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No usage reading yet.</Text>
          <Text dimColor>It appears after Claude's next reply (Pro/Max plans only).</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {list.map(limit => {
          const used = percentUsed(limit)
          return (
            <Box key={limit.kind} flexDirection="column" marginBottom={1}>
              <Text bold>
                {label(limit.kind)} <Text color={barColor(used, light)}>{used}% used</Text>
              </Text>
              <Text>
                {segments(used, width, light).map((seg, i) =>
                  seg.color ? <Text key={`s${i}`} color={seg.color}>{seg.char}</Text> : <Text key={`s${i}`} dimColor>{seg.char}</Text>,
                )}
              </Text>
              <Text dimColor>{untilReset(limit.resetsAt, at)}</Text>
            </Box>
          )
        })}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, limits)
    if (e.props.hasSurvey || list.length === 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const at = await read($, now)
    const light = await read($, isLight)

    return (
      <Box>
        {list.map((limit, i) => {
          const used = percentUsed(limit)
          const reset = shortReset(limit.resetsAt, at)
          return (
            <Text key={limit.kind}>
              {i > 0 && <Text dimColor>  ·  </Text>}
              <Text dimColor>{SHORT_LABELS[limit.kind] ?? limit.kind} </Text>
              {segments(used, 10, light).map((seg, s) =>
                seg.color ? <Text key={`s${s}`} color={seg.color}>{seg.char}</Text> : <Text key={`s${s}`} dimColor>{seg.char}</Text>,
              )}
              <Text color={barColor(used, light)}> {used}%</Text>
              {reset && <Text dimColor>  ↻ {reset}</Text>}
            </Text>
          )
        })}
      </Box>
    )
  })
}
