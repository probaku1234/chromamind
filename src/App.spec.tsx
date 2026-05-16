import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { InvokeArgs } from '@tauri-apps/api/core'
import { match } from 'ts-pattern'
import { LOCAL_STORAGE_KEY_PREFIX, TauriCommand } from './types.ts'
import { mockWindows } from '@tauri-apps/api/mocks'
import App from './App.tsx'
import { Provider } from '@/components/ui/provider'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  clearMocks()
  localStorage.clear()
  vi.useRealTimers()
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

    render(
      <Provider>
        <App />
      </Provider>,
    )

    expect(screen.getByText('Connect to ChromaDB')).toBeInTheDocument()
  })

  test('should render Local and Cloud mode toggle buttons', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    expect(screen.getByText('Local')).toBeInTheDocument()
    expect(screen.getByText('Cloud')).toBeInTheDocument()
  })

  test('should default to local mode and show tenant field', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    expect(screen.getByPlaceholderText('default_tenant')).toBeInTheDocument()
    expect(screen.queryByTestId('api-key-input')).not.toBeInTheDocument()
  })

  test('should show API key field when switching to cloud mode', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    fireEvent.click(screen.getByText('Cloud'))

    expect(screen.getByTestId('api-key-input')).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('default_tenant'),
    ).not.toBeInTheDocument()
  })

  test('should submit with default URL when url input is empty', async () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    const handleOnSubmitMock = vi.fn()
    screen.getByRole('form').onsubmit = handleOnSubmitMock

    fireEvent.click(screen.getByText('Connect'))

    expect(handleOnSubmitMock).toHaveBeenCalled()
  })

  test('should submit if url input is not empty', async () => {
    mockIPC(mockCommandHandler)

    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

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

    render(
      <Provider>
        <App />
      </Provider>,
    )

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

    render(
      <Provider>
        <App />
      </Provider>,
    )

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

    render(
      <Provider>
        <App />
      </Provider>,
    )

    fireEvent.click(screen.getByText('Cloud'))

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'https://api.trychroma.com' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await waitFor(() => expect(mock).toHaveBeenCalled(), {
      timeout: 5000,
    })

    const calls: string[] = mock.mock.calls.map(
      (c: unknown[]) => c[0] as string,
    )
    expect(calls).not.toContain(TauriCommand.CHECK_TENANT_AND_DATABASE)
  })

  test('should render ChromaMind version footer', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    expect(screen.getByText('ChromaMind v0.1.0')).toBeInTheDocument()
  })

  test('should render database field in both modes', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    expect(screen.getByPlaceholderText('default_database')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cloud'))

    expect(screen.getByPlaceholderText('default_database')).toBeInTheDocument()
  })

  test('should change URL placeholder when switching to cloud mode', () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    expect(
      screen.getByPlaceholderText('http://localhost:8000'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cloud'))

    expect(
      screen.getByPlaceholderText('https://api.trychroma.com'),
    ).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('http://localhost:8000'),
    ).not.toBeInTheDocument()
  })

  test('should show error message when health check fails', async () => {
    const failingHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> =>
      match(cmd)
        .with(TauriCommand.CREATE_CLIENT, () =>
          Promise.resolve(true as unknown as T),
        )
        .with(TauriCommand.HEALTH_CHECK, () =>
          Promise.reject('connection refused' as unknown as T),
        )
        .otherwise(() => Promise.resolve(true as unknown as T))

    mockIPC(failingHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await waitFor(() =>
      expect(screen.getByText('connection refused')).toBeInTheDocument(),
    )
  })

  test('should show error message when database is not found', async () => {
    const failingHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> =>
      match(cmd)
        .with(TauriCommand.CREATE_CLIENT, () =>
          Promise.resolve(true as unknown as T),
        )
        .with(TauriCommand.HEALTH_CHECK, () =>
          Promise.resolve(123 as unknown as T),
        )
        .with(TauriCommand.CHECK_TENANT_AND_DATABASE, () =>
          Promise.resolve(false as unknown as T),
        )
        .otherwise(() => Promise.resolve(true as unknown as T))

    mockIPC(failingHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await waitFor(() =>
      expect(screen.getByText(/database .* not found/)).toBeInTheDocument(),
    )
  })

  test('should show success feedback after successful connection', async () => {
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await waitFor(() =>
      expect(screen.getByTestId('success-feedback')).toBeInTheDocument(),
    )
  })

  test('should show "Connecting…" while connecting', async () => {
    let resolveHealth!: (v: number) => void
    const slowHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> =>
      match(cmd)
        .with(TauriCommand.CREATE_CLIENT, () =>
          Promise.resolve(true as unknown as T),
        )
        .with(
          TauriCommand.HEALTH_CHECK,
          () =>
            new Promise<T>((res) => {
              resolveHealth = (v) => res(v as unknown as T)
            }),
        )
        .otherwise(() => Promise.resolve(true as unknown as T))

    mockIPC(slowHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await waitFor(() =>
      expect(screen.getByText('Connecting…')).toBeInTheDocument(),
    )
    expect(screen.getByText('Connecting…')).toBeDisabled()

    // Unblock so component finishes
    resolveHealth(123)
    await waitFor(() => expect(screen.getByText('Connect')).toBeInTheDocument())
  })

  test('should save url, database, and tenant to localStorage on successful local connection', async () => {
    vi.useFakeTimers()
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await vi.runAllTimersAsync()

    // Advance past the 2 s setTimeout
    vi.advanceTimersByTime(2000)
    await vi.runAllTimersAsync()

    expect(localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`)).toBe(
      'http://localhost:8000',
    )
    expect(localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_database`)).toBe(
      'default_database',
    )
    expect(localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_tenant`)).toBe(
      'default_tenant',
    )
  })

  test('should not save tenant to localStorage on successful cloud connection', async () => {
    vi.useFakeTimers()
    mockIPC(mockCommandHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    fireEvent.click(screen.getByText('Cloud'))
    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'https://api.trychroma.com' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await vi.runAllTimersAsync()

    vi.advanceTimersByTime(2000)
    await vi.runAllTimersAsync()

    expect(localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`)).toBe(
      'https://api.trychroma.com',
    )
    expect(
      localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_tenant`),
    ).toBeNull()
  })

  test('should not save to localStorage when health check fails', async () => {
    const failingHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined,
    ): Promise<T> =>
      match(cmd)
        .with(TauriCommand.CREATE_CLIENT, () =>
          Promise.resolve(true as unknown as T),
        )
        .with(TauriCommand.HEALTH_CHECK, () =>
          Promise.reject('error' as unknown as T),
        )
        .otherwise(() => Promise.resolve(true as unknown as T))

    mockIPC(failingHandler)
    mockWindows('main')

    render(
      <Provider>
        <App />
      </Provider>,
    )

    fireEvent.change(screen.getByTestId('url-input'), {
      target: { value: 'http://localhost:8000' },
    })
    fireEvent.click(screen.getByText('Connect'))

    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument())

    expect(localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`)).toBeNull()
  })
})
