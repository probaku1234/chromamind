import { afterEach, describe, expect, test, vi } from 'vitest'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { InvokeArgs } from '@tauri-apps/api/core'
import { match } from 'ts-pattern'
import { TauriCommand } from './types.ts'
import { mockWindows } from '@tauri-apps/api/mocks'
import { Provider } from '@/components/ui/provider'
import App from './App.tsx'

afterEach(() => {
  clearMocks()
})

describe('App', () => {
  const mockCommandHandler = <T, >(
    cmd: string,
    _: InvokeArgs | undefined,
  ): Promise<T> => {
    return match(cmd)
      .with(TauriCommand.CREATE_CLIENT, () =>
        Promise.resolve(true as unknown as T),
      )
      .with(TauriCommand.HEALTH_CHECK, () =>
        Promise.resolve(123 as unknown as T),
      )
      .with(TauriCommand.CHECK_TENANT_AND_DATABASE, () =>
        Promise.resolve(true as unknown as T),
      )
      .with(TauriCommand.CREATE_WINDOW, () =>
        Promise.resolve(true as unknown as T),
      )
      .otherwise(() => {
        // throw new Error(`Unexpected command: ${cmd}`)
        console.log(cmd)
        return Promise.resolve(true as unknown as T)
      })
  }

  test('should renders App component', () => {
    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')
    mockWindows('main')

    render(<Provider><App /></Provider>)

    expect(screen.getByText('Connect to ChromaDB')).toBeInTheDocument()
  })

  test('should not submit if url input is empty', async () => {
    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    mockWindows('main')

    render(<Provider><App /></Provider>)

    const handleOnSubmitMock = vi.fn()
    screen.getByRole('form').onsubmit = handleOnSubmitMock

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    })

    fireEvent.click(screen.getByText('Connect'))

    expect(handleOnSubmitMock).not.toHaveBeenCalled()
  })

  test('should submit if url input is not empty', async () => {
    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    mockWindows('main')

    render(<Provider><App /></Provider>)

    const handleOnSubmitMock = vi.fn()
    screen.getByRole('form').onsubmit = handleOnSubmitMock

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    })

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    expect(handleOnSubmitMock).toHaveBeenCalled()
  })

  test('should not open new window if health check fails', async () => {
    const mockCommandHandler = <T, >(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> => {
      return match(cmd)
        .with(TauriCommand.CREATE_CLIENT, () =>
          Promise.resolve(true as unknown as T),
        )
        .with(TauriCommand.HEALTH_CHECK, () =>
          Promise.reject('something wrong' as unknown as T),
        )
        .with(TauriCommand.CHECK_TENANT_AND_DATABASE, () =>
          Promise.resolve(true as unknown as T),
        )
        .with(TauriCommand.CREATE_WINDOW, () =>
          Promise.resolve(true as unknown as T),
        )
        .otherwise(() => {
          // throw new Error(`Unexpected command: ${cmd}`)
          console.log(cmd)
          return Promise.resolve(true as unknown as T)
        })
    }

    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    mockWindows('main')

    render(<Provider><App /></Provider>)

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    })

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await waitFor(() => expect(mock).toHaveBeenCalled(), {
      timeout: 5000,
    })

    expect(mock).not.toHaveBeenCalledWith(TauriCommand.CREATE_WINDOW, {
      url: 'http://localhost:8000',
    })
  })

  test('should not open new window if check tenant database fails', async () => {
    const mockCommandHandler = <T, >(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> => {
      return match(cmd)
        .with(TauriCommand.CREATE_CLIENT, () =>
          Promise.resolve(true as unknown as T),
        )
        .with(TauriCommand.HEALTH_CHECK, () =>
          Promise.resolve(123 as unknown as T),
        )
        .with(TauriCommand.CHECK_TENANT_AND_DATABASE, () =>
          Promise.resolve(false as unknown as T),
        )
        .with(TauriCommand.CREATE_WINDOW, () =>
          Promise.resolve(true as unknown as T),
        )
        .otherwise(() => {
          // throw new Error(`Unexpected command: ${cmd}`)
          console.log(cmd)
          return Promise.resolve(true as unknown as T)
        })
    }

    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    mockWindows('main')

    render(<Provider><App /></Provider>)

    await waitFor(() => expect(mock).toHaveBeenCalledTimes(1), {
      timeout: 5000,
    })

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await waitFor(() => expect(mock).toHaveBeenCalled(), {
      timeout: 5000,
    })

    expect(mock).not.toHaveBeenCalledWith(TauriCommand.CREATE_WINDOW, {
      url: 'http://localhost:8000',
    })
  })
})
