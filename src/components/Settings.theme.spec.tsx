/**
 * Tests for the theme editing dialog in Settings.
 *
 * The Monaco editor is replaced with a <textarea> that fires onValidate
 * synchronously so we can test Save-button state without a real language server.
 *
 * react-frame-component is stubbed so we never spin up a real iframe,
 * avoiding cross-document Emotion/Chakra conflicts in jsdom.
 */
import React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { clearMocks } from '@tauri-apps/api/mocks'
import { fireEvent, screen } from '@testing-library/react'
import renderWithProvider from '../utils/renderWithProvider'
import { Provider } from '@/components/ui/provider'
import { CUSTOM_THEME_KEY, CUSTOM_THEME_PREVIEW_KEY } from '../types'
import Settings from './Settings'

// ── Monaco mock ────────────────────────────────────────────────────────────
// Renders a <textarea> and calls onValidate after every change so we can
// test the Save-button disabled/enabled flow without a real JSON language server.
vi.mock('@monaco-editor/react', () => ({
  default: ({
    defaultValue,
    onChange,
    onValidate,
  }: {
    defaultValue?: string
    onChange?: (val: string) => void
    onValidate?: (markers: { message: string }[]) => void
  }) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      onChange?.(val)
      try {
        JSON.parse(val)
        onValidate?.([])
      } catch {
        onValidate?.([{ message: 'Syntax error' }])
      }
    }
    return (
      <textarea
        data-testid="monaco-editor"
        defaultValue={defaultValue}
        onChange={handleChange}
      />
    )
  },
}))

// ── react-frame-component mock ─────────────────────────────────────────────
// Renders the Frame as a plain div (visible in DOM) but skips FrameContextConsumer
// to avoid creating a duplicate Emotion/Chakra system inside jsdom.
vi.mock('react-frame-component', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="preview-frame">{children}</div>
  ),
  FrameContextConsumer: () => null,
}))

// ── Helpers ────────────────────────────────────────────────────────────────
const renderSettings = () =>
  renderWithProvider(
    <Provider>
      <Settings />
    </Provider>,
    { initialState: { currentMenu: 'Settings', currentCollection: '' } },
  )

const openThemeDialog = async () => {
  fireEvent.click(screen.getByText('Manage'))
  return screen.findByTestId('monaco-editor')
}

// ── Setup / teardown ───────────────────────────────────────────────────────
// jsdom does not allow vi.spyOn on window.location.reload — redefine once.
const reloadMock = vi.fn()
beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload: reloadMock },
  })
})

beforeEach(() => {
  localStorage.clear()
  reloadMock.mockClear()
})

afterEach(() => {
  clearMocks()
  localStorage.clear()
})

// ── Tests ──────────────────────────────────────────────────────────────────
describe('Settings — theme dialog', () => {
  test('opens when Manage is clicked', async () => {
    renderSettings()
    fireEvent.click(screen.getByText('Manage'))
    expect(await screen.findByTestId('monaco-editor')).toBeInTheDocument()
  })

  test('preview frame is rendered alongside the editor', async () => {
    renderSettings()
    await openThemeDialog()
    expect(screen.getByTestId('preview-frame')).toBeInTheDocument()
  })

  // ── Editor initial value ─────────────────────────────────────────────────

  test('editor loads CUSTOM_THEME_PREVIEW_KEY when it exists (in-progress WIP)', async () => {
    const wip = JSON.stringify({ theme: { tokens: {} } }, null, 2)
    localStorage.setItem(CUSTOM_THEME_PREVIEW_KEY, wip)

    renderSettings()
    await openThemeDialog()

    expect((screen.getByTestId('monaco-editor') as HTMLTextAreaElement).value).toBe(wip)
  })

  test('editor falls back to CUSTOM_THEME_KEY when no WIP preview exists', async () => {
    const saved = JSON.stringify({ theme: { tokens: { colors: {} } } }, null, 2)
    localStorage.setItem(CUSTOM_THEME_KEY, saved)

    renderSettings()
    await openThemeDialog()

    expect((screen.getByTestId('monaco-editor') as HTMLTextAreaElement).value).toBe(saved)
  })

  test('editor uses built-in defaultCustomConfig when neither localStorage key exists', async () => {
    renderSettings()
    await openThemeDialog()

    // The editor must show something — not empty
    const editorValue = (screen.getByTestId('monaco-editor') as HTMLTextAreaElement).value
    expect(editorValue.length).toBeGreaterThan(0)
    expect(JSON.parse(editorValue)).toMatchObject({ theme: expect.anything() })
  })

  // ── Save button state ────────────────────────────────────────────────────

  test('Save button is disabled when editor contains invalid JSON', async () => {
    renderSettings()
    await openThemeDialog()

    fireEvent.change(screen.getByTestId('monaco-editor'), {
      target: { value: '{ broken json' },
    })

    expect(screen.getByText('Save').closest('button')).toBeDisabled()
  })

  test('Save button is re-enabled after fixing previously invalid JSON', async () => {
    renderSettings()
    await openThemeDialog()

    // Break it first
    fireEvent.change(screen.getByTestId('monaco-editor'), {
      target: { value: '{ broken json' },
    })
    expect(screen.getByText('Save').closest('button')).toBeDisabled()

    // Fix it
    fireEvent.change(screen.getByTestId('monaco-editor'), {
      target: { value: '{}' },
    })
    expect(screen.getByText('Save').closest('button')).not.toBeDisabled()
  })

  // ── Save behaviour ───────────────────────────────────────────────────────

  test('Save persists the current theme to CUSTOM_THEME_KEY', async () => {
    const newTheme = '{"theme": {}}'
    renderSettings()
    await openThemeDialog()

    fireEvent.change(screen.getByTestId('monaco-editor'), {
      target: { value: newTheme },
    })
    fireEvent.click(screen.getByText('Save'))

    expect(JSON.parse(localStorage.getItem(CUSTOM_THEME_KEY)!)).toEqual(JSON.parse(newTheme))
  })

  test('Save removes CUSTOM_THEME_PREVIEW_KEY so the next session starts from the saved theme', async () => {
    localStorage.setItem(CUSTOM_THEME_PREVIEW_KEY, '{"wip": true}')
    renderSettings()
    await openThemeDialog()

    fireEvent.change(screen.getByTestId('monaco-editor'), {
      target: { value: '{}' },
    })
    fireEvent.click(screen.getByText('Save'))

    expect(localStorage.getItem(CUSTOM_THEME_PREVIEW_KEY)).toBeNull()
  })

  test('Save triggers a page reload to apply the new theme', async () => {
    renderSettings()
    await openThemeDialog()

    fireEvent.change(screen.getByTestId('monaco-editor'), {
      target: { value: '{}' },
    })
    fireEvent.click(screen.getByText('Save'))

    expect(reloadMock).toHaveBeenCalledOnce()
  })

  // ── Cancel / WIP preservation ────────────────────────────────────────────

  test('Cancel does NOT clear CUSTOM_THEME_PREVIEW_KEY — WIP edits are preserved', async () => {
    const wip = JSON.stringify({ wip: true })
    localStorage.setItem(CUSTOM_THEME_PREVIEW_KEY, wip)

    renderSettings()
    await openThemeDialog()

    fireEvent.click(screen.getByText('Cancel'))

    expect(localStorage.getItem(CUSTOM_THEME_PREVIEW_KEY)).toBe(wip)
  })

  test('Cancel does NOT reload the page', async () => {
    renderSettings()
    await openThemeDialog()
    fireEvent.click(screen.getByText('Cancel'))

    expect(reloadMock).not.toHaveBeenCalled()
  })

  // ── Reset to Default ─────────────────────────────────────────────────────

  test('Reset to Default button is present in the theme dialog', async () => {
    renderSettings()
    await openThemeDialog()
    expect(screen.getByText('Reset to Default')).toBeInTheDocument()
  })

  test('Reset to Default clears CUSTOM_THEME_KEY from localStorage', async () => {
    localStorage.setItem(CUSTOM_THEME_KEY, '{"theme": {}}')
    renderSettings()
    await openThemeDialog()

    fireEvent.click(screen.getByText('Reset to Default'))

    expect(localStorage.getItem(CUSTOM_THEME_KEY)).toBeNull()
  })

  test('Reset to Default clears CUSTOM_THEME_PREVIEW_KEY from localStorage', async () => {
    localStorage.setItem(CUSTOM_THEME_PREVIEW_KEY, '{"wip": true}')
    renderSettings()
    await openThemeDialog()

    fireEvent.click(screen.getByText('Reset to Default'))

    expect(localStorage.getItem(CUSTOM_THEME_PREVIEW_KEY)).toBeNull()
  })

  test('Reset to Default re-enables Save button if it was disabled due to invalid JSON', async () => {
    renderSettings()
    await openThemeDialog()

    fireEvent.change(screen.getByTestId('monaco-editor'), {
      target: { value: '{ bad json' },
    })
    expect(screen.getByText('Save').closest('button')).toBeDisabled()

    fireEvent.click(screen.getByText('Reset to Default'))

    expect(screen.getByText('Save').closest('button')).not.toBeDisabled()
  })

  test('Reset to Default does NOT trigger a page reload', async () => {
    renderSettings()
    await openThemeDialog()

    fireEvent.click(screen.getByText('Reset to Default'))

    expect(reloadMock).not.toHaveBeenCalled()
  })
})
