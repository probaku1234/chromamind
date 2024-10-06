import { afterEach, describe, expect, test, vi } from 'vitest'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import Settings from './Settings'
import renderWithProvider from '../utils/renderWithProvider'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { InvokeArgs } from '@tauri-apps/api/core'
import { match } from 'ts-pattern'
import { TauriCommand } from '../types.ts'

afterEach(() => {
  clearMocks()
})

describe('Settings', () => {
  test('should renders Settings component', () => {
    renderWithProvider(<Settings />, {
      initialState: {
        currentMenu: 'Settings',
        currentCollection: 'test',
      },
    })

    expect(screen.getByText('Reset Chroma')).toBeInTheDocument()
  })

  test('should call resetChroma function', async () => {
    const mockCommandHandler = <T, >(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> => {
      return match(cmd)
        .with(TauriCommand.RESET_CHROMA, () => Promise.resolve(true as unknown as T))
        .otherwise(() => {
          throw new Error(`Unexpected command: ${cmd}`)
        })
    }

    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    renderWithProvider(<Settings />, {
      initialState: {
        currentMenu: 'Settings',
        currentCollection: 'test',
      },
    })

    fireEvent.click(screen.getByText('Reset Chroma'))
    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(mock).toHaveBeenCalledWith(TauriCommand.RESET_CHROMA, {}, undefined)
    })
  })
})