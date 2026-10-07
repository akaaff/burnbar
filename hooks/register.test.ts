import { expect, mock, test } from 'claude-code/testing'

import type { On } from 'claude-code'
import { barColor, gradient, paletteFor, percentUsed, segments, untilReset } from './register'

const NOW = Date.parse('2026-10-07T12:00:00Z')

test('bar fills by percent used', () => {
  const chars = (used: number, width: number) => segments(used, width).map(s => s.char).join('')
  expect(chars(50, 10)).toBe('▰▰▰▰▰▱▱▱▱▱')
  expect(chars(0, 4)).toBe('▱▱▱▱')
  expect(chars(120, 4)).toBe('▰▰▰▰')
})

test('percent used rounds and keeps an overrun', () => {
  expect(percentUsed({ kind: 'five_hour', percentUsed: 23.5 })).toBe(24)
  expect(percentUsed({ kind: 'spend_limit', percentUsed: 120 })).toBe(120)
})

test('gradient runs red to yellow to green', () => {
  expect(gradient(0)).toBe('#df2020')
  expect(gradient(0.5)).toBe('#dfdf20')
  expect(gradient(1)).toBe('#20df20')
  // the number turns red as usage climbs
  expect(barColor(0)).toBe(gradient(1))
  expect(barColor(100)).toBe(gradient(0))
  expect(barColor(150)).toBe(gradient(0))
})

test('segments colour filled ones green to red, leave empty ones plain', () => {
  const segs = segments(30, 10)
  expect(segs.map(s => s.char).join('')).toBe('▰▰▰▱▱▱▱▱▱▱')
  expect(segs[0].color).toBe(gradient(0.95))
  expect(segs[3].color).toBe(undefined)
})

test('reset countdown', () => {
  expect(untilReset('2026-10-07T14:14:00Z', NOW)).toBe('resets in 2h 14m')
  expect(untilReset('2026-10-10T16:00:00Z', NOW)).toBe('resets in 3d 4h')
  expect(untilReset(undefined, NOW)).toBe('')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`pane draws a bar per limit after a measurement (${surface})`, async ($, on) => {
    mock.clock(on, { now: NOW })
    on('session.measure', ($, e) => ({ changed: e.changed }))
    await $.session.measure({
      context: { window: 200000 } as never,
      rateLimits: [
        { kind: 'five_hour', percentUsed: 40 },
        { kind: 'seven_day', percentUsed: 95 },
      ],
      changed: ['rateLimits'],
    })
    const ui = await $.ui.mount({
      plugin: 'burnbar',
      surface,
      component: 'Pane',
      requestId: 'burnbar',
      props: {} as never,
    } as never)
    expect(await ui.find({ text: '5-hour' })).toBeTruthy()
    expect(await ui.find({ text: '40% used' })).toBeTruthy()
    expect(await ui.find({ text: '95% used' })).toBeTruthy()
  })
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`strip above the prompt shows each limit (${surface})`, async ($, on) => {
    mock.clock(on, { now: NOW })
    on('session.measure', ($, e) => ({ changed: e.changed }))
    await $.session.measure({
      context: { window: 200000 } as never,
      rateLimits: [
        { kind: 'five_hour', percentUsed: 23, resetsAt: '2026-10-07T14:14:00Z' },
        { kind: 'seven_day', percentUsed: 8 },
      ],
      changed: ['rateLimits'],
    })
    const ui = await $.ui.mount({
      plugin: 'burnbar',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false } as never,
    } as never)
    expect(await ui.find({ text: '23%' })).toBeTruthy()
    expect(await ui.find({ text: '8%' })).toBeTruthy()
  })
}

test('theme ids map to palettes', () => {
  expect(paletteFor('dark')).toBe('dark')
  expect(paletteFor('dark-daltonized')).toBe('dark')
  expect(paletteFor('dark-ansi')).toBe('dark')
  expect(paletteFor('light')).toBe('light')
  expect(paletteFor('light-daltonized')).toBe('light')
  expect(paletteFor('light-ansi')).toBe('light')
  expect(paletteFor('auto')).toBe('auto')
  expect(paletteFor(undefined)).toBe('dark')
})

test('palettes darken from dark to auto to light', () => {
  const red = (hex: string) => parseInt(hex.slice(1, 3), 16)
  const yellow = { dark: gradient(0.5, 'dark'), auto: gradient(0.5, 'auto'), light: gradient(0.5, 'light') }
  expect(red(yellow.auto)).toBeLessThan(red(yellow.dark))
  expect(red(yellow.light)).toBeLessThan(red(yellow.auto))
})

// what the engine answers beneath the plugin when a session starts, with the given theme
function startWorld(on: On, theme: string) {
  const clock = mock.clock(on, { now: NOW })
  on('command.register', ($, e) => ({ value: { command: e.name } }) as never)
  on('session.usage', () => ({
    value: { startedAt: NOW, context: { window: 200000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 100 }] },
  }) as never)
  on('config.list', () => ({
    value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: theme, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }],
  }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  return { clock, setTheme: (next: string) => { theme = next } }
}

// the colour of the first (leftmost) filled segment in the strip
async function firstSegmentColor($: Parameters<Parameters<typeof test>[1] & Function>[0]): Promise<unknown> {
  const ui = await $.ui.mount({ plugin: 'burnbar', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false } as never } as never)
  return (await ui.find({ type: 'Text', text: /^▰$/ }))?.props.color
}

for (const [theme, tone] of [['dark', 'dark'], ['light', 'light'], ['auto', 'auto'], ['light-daltonized', 'light']] as const) {
  test(`a session started under the ${theme} theme draws the ${tone} palette`, async ($, on) => {
    startWorld(on, theme)
    await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true })
    expect(await firstSegmentColor($ as never)).toBe(gradient(0.95, tone))
  })
}

test('a theme change mid-session shows within a minute', async ($, on) => {
  const world = startWorld(on, 'dark')
  await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true })
  expect(await firstSegmentColor($ as never)).toBe(gradient(0.95, 'dark'))
  world.setTheme('light')
  await world.clock.advance(60_000)
  expect(await firstSegmentColor($ as never)).toBe(gradient(0.95, 'light'))
})

test('a theme change shows after the next reply', async ($, on) => {
  const world = startWorld(on, 'dark')
  on('session.measure', ($, e) => ({ changed: e.changed }))
  await $.session.start({ cwd: '.', surface: 'terminal', isInteractive: true })
  world.setTheme('light')
  await $.session.measure({ context: { window: 200000 } as never, rateLimits: [{ kind: 'five_hour', percentUsed: 100 }], changed: ['rateLimits'] })
  expect(await firstSegmentColor($ as never)).toBe(gradient(0.95, 'light'))
})
