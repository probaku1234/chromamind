import Home from './Home'
import { describe, test, beforeAll, afterEach, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks'
import { InvokeArgs } from '@tauri-apps/api/core'

beforeAll(() => {})

afterEach(() => {
  clearMocks()
})

describe('Home', () => {
  test('should render the Home component', async () => {
    const mockCommandHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> => {
      if (cmd === 'get_chroma_version') {
        return Promise.resolve('0.1.0' as unknown as T) // casting string to T
      } else {
        return Promise.resolve('unknown command' as unknown as T) // casting string to T
      }
    }

    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    render(<Home />)

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Chroma Version: 0.1.0')).toBeInTheDocument()

    // screen.debug();
  })
})
