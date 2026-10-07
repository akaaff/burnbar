import { expect, mock, test } from 'claude-code/testing'

import { barColor, gradient, isLightTheme, percentUsed, segments, untilReset } from './register'

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

test('light theme gets a darker palette', () => {
  expect(isLightTheme('light')).toBe(true)
  expect(isLightTheme('light-daltonized')).toBe(true)
  expect(isLightTheme('dark')).toBe(false)
  expect(gradient(0.5, true)).not.toBe(gradient(0.5))
  // yellow on a light theme is darker than on dark
  expect(parseInt(gradient(0.5, true).slice(1, 3), 16)).toBeLessThan(parseInt(gradient(0.5).slice(1, 3), 16))
})
