import { afterEach, describe, expect, test, vi } from 'vitest'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { InvokeArgs } from '@tauri-apps/api/core'
import { match } from 'ts-pattern'
import { TauriCommand } from './types.ts'
import { mockWindows } from '@tauri-apps/api/mocks'
import App from './App.tsx'

afterEach(() => {
  clearMocks()
})

describe('App', () => {
  const mockCommandHandler = <T,>(
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
        console.log(cmd)
        return Promise.resolve(true as unknown as T)
      })
  }

  test('should render App component', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(<App />)

    expect(screen.getByText('Connect to ChromaDB')).toBeInTheDocument()
  })

  test('should render Local and Cloud mode toggle buttons', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(<App />)

    expect(screen.getByText('Local')).toBeInTheDocument()
    expect(screen.getByText('Cloud')).toBeInTheDocument()
  })

  test('should default to local mode and show tenant field', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(<App />)

    expect(screen.getByPlaceholderText('default_tenant')).toBeInTheDocument()
    expect(screen.queryByTestId('api-key-input')).not.toBeInTheDocument()
  })

  test('should show API key field when switching to cloud mode', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(<App />)

    fireEvent.click(screen.getByText('Cloud'))

    expect(screen.getByTestId('api-key-input')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('default_tenant')).not.toBeInTheDocument()
  })

  test('should submit with default URL when url input is empty', async () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(<App />)

    const handleOnSubmitMock = vi.fn()
    screen.getByRole('form').onsubmit = handleOnSubmitMock

    fireEvent.click(screen.getByText('Connect'))

    expect(handleOnSubmitMock).toHaveBeenCalled()
  })

  test('should submit if url input is not empty', async () => {
    mockIPC(mockCommandHandler)

    mockWindows('main')

    render(<App />)

    const handleOnSubmitMock = vi.fn()
    screen.getByRole('form').onsubmit = handleOnSubmitMock

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    expect(handleOnSubmitMock).toHaveBeenCalled()
  })

  test('should not open new window if health check fails', async () => {
    const mockCommandHandler = <T,>(
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
          console.log(cmd)
          return Promise.resolve(true as unknown as T)
        })
    }

    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    mockWindows('main')

    render(<App />)

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
    const mockCommandHandler = <T,>(
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
          console.log(cmd)
          return Promise.resolve(true as unknown as T)
        })
    }

    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    mockWindows('main')

    render(<App />)

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

  test('should not call CHECK_TENANT_AND_DATABASE in cloud mode', async () => {
    mockIPC(mockCommandHandler)

    // @ts-ignore
    const mock = vi.spyOn(window.__TAURI_INTERNALS__, 'invoke')

    mockWindows('main')

    render(<App />)

    fireEvent.click(screen.getByText('Cloud'))

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'https://api.trychroma.com' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await waitFor(() => expect(mock).toHaveBeenCalled(), {
      timeout: 5000,
    })

    const calls: string[] = mock.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(calls).not.toContain(TauriCommand.CHECK_TENANT_AND_DATABASE)
  })
})
