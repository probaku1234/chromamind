/**
 * Tests for src/theme.ts — module-level startup behaviour.
 *
 * theme.ts runs code at import time (reads localStorage, calls createSystem).
 * We use vi.resetModules() + dynamic import so each test gets a fresh module
 * with whatever localStorage state we pre-configure.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// The key strings are stable constants; we avoid importing from types.ts here
// so that vi.resetModules() doesn't interfere with type imports.
const CUSTOM_THEME_KEY = 'chromamind-custom-theme'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('theme — startup', () => {
  test('exports a valid Chakra system object', async () => {
    const { system } = await import('./theme')
    expect(system).toBeDefined()
    expect(typeof system).toBe('object')
  })

  test('creates system successfully when localStorage is empty', async () => {
    // No key set — falls back to defaultCustomConfig
    const { system } = await import('./theme')
    expect(system).toBeDefined()
  })

  test('creates system successfully when a valid theme is saved', async () => {
    const validTheme = JSON.stringify({ theme: { tokens: { colors: {} } } })
    localStorage.setItem(CUSTOM_THEME_KEY, validTheme)

    const { system } = await import('./theme')
    expect(system).toBeDefined()
  })

  test('does not log an error or touch localStorage when theme JSON is valid', async () => {
    const validTheme = JSON.stringify({ theme: {} })
    localStorage.setItem(CUSTOM_THEME_KEY, validTheme)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await import('./theme')

    expect(errorSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(CUSTOM_THEME_KEY)).toBe(validTheme)
  })

  test('falls back to defaults without throwing when localStorage has corrupted JSON', async () => {
    localStorage.setItem(CUSTOM_THEME_KEY, '{ this is not : valid JSON !!!}')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Must not throw
    await expect(import('./theme')).resolves.not.toThrow()
  })

  test('logs a warning that includes "Corrupted custom theme" when JSON is invalid', async () => {
    localStorage.setItem(CUSTOM_THEME_KEY, '<<< bad >>>')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await import('./theme')

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Corrupted custom theme'),
      expect.anything(),
    )
  })

  test('removes the corrupted key from localStorage so it does not crash on subsequent loads', async () => {
    localStorage.setItem(CUSTOM_THEME_KEY, 'not-json-at-all')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await import('./theme')

    expect(localStorage.getItem(CUSTOM_THEME_KEY)).toBeNull()
  })

  test('still exports a usable system after recovering from corrupted JSON', async () => {
    localStorage.setItem(CUSTOM_THEME_KEY, '}{')
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { system } = await import('./theme')
    expect(system).toBeDefined()
  })
})
